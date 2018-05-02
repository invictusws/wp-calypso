/** @format */

/**
 * External dependencies
 */
import { random, map } from 'lodash';
import { translate } from 'i18n-calypso';
import { parse } from 'qs';

/**
 * Internal dependencies
 */
import { http } from 'state/data-layer/wpcom-http/actions';
import { dispatchRequestEx } from 'state/data-layer/wpcom-http/utils';
import warn from 'lib/warn';
import { READER_STREAMS_PAGE_REQUEST } from 'state/action-types';
import { receivePage, receiveUpdates } from 'state/reader/streams/actions';
import { errorNotice } from 'state/notices/actions';
import { receivePosts } from 'state/reader/posts/actions';
import { keyForPost } from 'reader/post-key';
import { recordTracksEvent } from 'state/analytics/actions';

/**
 * Pull the suffix off of a stream key
 *
 * A stream key is a : delimited string, with the form
 * {prefix}:{suffix}
 *
 * Prefix cannot contain a colon, while the suffix may.
 *
 * A colon is not required.
 *
 * Valid IDs look like
 * `following`
 * `site:1234`
 * `search:a:value` ( prefix is `search`, suffix is `a:value` )
 *
 * @param  {String} streamKey The stream ID to break apart
 * @return {String}          The stream ID suffix
 */
function streamKeySuffix( streamKey ) {
	return streamKey.substring( streamKey.indexOf( ':' ) + 1 );
}

const analyticsAlgoMap = new Map();
function analyticsForStream( { streamKey, algorithm, posts } ) {
	if ( ! streamKey || ! algorithm || ! posts ) {
		return [];
	}

	analyticsAlgoMap.set( streamKey, algorithm );

	const eventName = 'calypso_traintracks_render';
	const analyticsActions = posts
		.filter( post => !! post.railcar )
		.map( post => recordTracksEvent( eventName, post.railcar ) );
	return analyticsActions;
}
const getAlgorithmForStream = streamKey => analyticsAlgoMap.get( streamKey );

export const PER_FETCH = 6;
const PER_POLL = 5;
const PER_GAP = 40;

export const QUERY_META = [ 'post', 'discover_original_post' ].join( ',' );
export const getQueryString = ( extras = {} ) => {
	return { orderBy: 'date', meta: QUERY_META, ...extras, content_width: 675 };
};
const defaultQueryFn = getQueryString;

export const SITE_LIMITER_FIELDS = [
	'ID',
	'site_ID',
	'date',
	'feed_ID',
	'feed_item_ID',
	'global_ID',
];
function getQueryStringForPoll( extraFields = [], extraQueryParams = {} ) {
	return {
		orderBy: 'date',
		number: PER_POLL,
		fields: [ SITE_LIMITER_FIELDS, ...extraFields ].join( ',' ),
		...extraQueryParams,
	};
}

const streamApis = {
	following: {
		path: () => '/read/following',
		dateProperty: 'date',
		pollQuery: getQueryStringForPoll,
	},
	search: {
		path: () => '/read/search',
		dateProperty: 'date',
		query: ( pageHandle, { streamKey } ) => {
			const { sort, q } = JSON.parse( streamKeySuffix( streamKey ) );
			return { sort, q, ...pageHandle, content_width: 675 };
		},
	},
	feed: {
		path: ( { streamKey } ) => `/read/feed/${ streamKeySuffix( streamKey ) }/posts`,
		dateProperty: 'date',
		pollQuery: getQueryStringForPoll,
	},
	site: {
		path: ( { streamKey } ) => `/read/sites/${ streamKeySuffix( streamKey ) }/posts`,
		dateProperty: 'date',
		pollQuery: getQueryStringForPoll,
	},
	conversations: {
		path: () => '/read/conversations',
		dateProperty: 'last_comment_date_gmt',
		pollQuery: () => getQueryStringForPoll( [ 'last_comment_date_gmt', 'comments' ] ),
	},
	featured: {
		path: ( { streamKey } ) => `/read/sites/${ streamKeySuffix( streamKey ) }/featured`,
		dateProperty: 'date',
	},
	a8c: {
		path: () => '/read/a8c',
		dateProperty: 'date',
		pollQuery: getQueryStringForPoll,
	},
	'conversations-a8c': {
		path: () => '/read/conversations',
		dateProperty: 'last_comment_date_gmt',
		query: extras => getQueryString( { ...extras, index: 'a8c' } ),
		pollQuery: () =>
			getQueryStringForPoll( [ 'last_comment_date_gmt', 'comments' ], { index: 'a8c' } ),
	},
	likes: {
		path: () => '/read/liked',
		dateProperty: 'liked_on',
		pollQuery: () => getQueryStringForPoll( [ 'date_liked' ] ),
	},
	recommendations_posts: {
		path: () => '/read/recommendations/posts',
		dateProperty: 'date',
		query: ( { query } ) => {
			return {
				...query,
				seed: random( 0, 1000 ),
				algorithm: 'read:recommendations:posts/es/1',
			};
		},
	},
	custom_recs_posts_with_images: {
		path: () => '/read/recommendations/posts',
		dateProperty: 'date',
		query: extras =>
			getQueryString( {
				...extras,
				seed: random( 0, 1000 ),
				alg_prefix: 'read:recommendations:posts',
			} ),
	},
	tag: {
		path: ( { streamKey } ) => `/read/tags/${ streamKeySuffix( streamKey ) }/posts`,
		dateProperty: 'date',
	},
	list: {
		path: ( { streamKey } ) => {
			const { owner, slug } = JSON.parse( streamKeySuffix( streamKey ) );
			return `/read/list/${ owner }/${ slug }/posts`;
		},
		dateProperty: 'date',
	},
};

/**
 * Request a page for the given stream
 * @param  {object}   action   Action being handled
 * @returns {object} http action for data-layer to dispatch
 */
export function requestPage( action ) {
	const { payload: { streamKey, streamType, pageHandle, isPoll, gap } } = action;
	const api = streamApis[ streamType ];

	if ( ! api ) {
		warn( `Unable to determine api path for ${ streamKey }` );
		return;
	}

	const {
		apiVersion = '1.2',
		path,
		query = defaultQueryFn,
		pollQuery = getQueryStringForPoll,
	} = api;

	const algorithm = getAlgorithmForStream( streamKey )
		? { algorithm: getAlgorithmForStream( streamKey ) }
		: {};

	return http( {
		method: 'GET',
		path: path( { ...action.payload } ),
		apiVersion,
		query: isPoll
			? pollQuery( { ...algorithm } )
			: query(
					{ ...pageHandle, ...algorithm, number: !! gap ? PER_GAP : PER_FETCH },
					action.payload
				),
		onSuccess: action,
		onFailure: action,
	} );
}

export function fromApi( data ) {
	// TODO: is there any transformation to do here?
	return data;
}

export function handlePage( action, data ) {
	const { posts, date_range, meta, next_page } = data;
	const { streamKey, query, isPoll, gap, streamType } = action.payload;
	const { dateProperty } = streamApis[ streamType ];
	let pageHandle = {};

	if ( meta && meta.next_page ) {
		// sites give pange handles nested within the meta key
		pageHandle = { page_handle: next_page || meta.next_page };
	} else if ( date_range && date_range.after ) {
		// feeds use date_range. no next_page handles here
		// search api will give you a date_range but for relevance search it will have before/after=null
		// and offsets must be used
		const { after } = date_range;
		pageHandle = { before: after };
	} else if ( next_page ) {
		// search api returns next_page as top-level.
		// but weirdly it returns the next querystring necessary
		// so this code breaks it down into an object
		// to be re-stringified later.
		// TODO: stop doing this extra work
		pageHandle = parse( next_page );
	}

	const actions = analyticsForStream( { streamKey, algorithm: data.algorithm, posts } );

	const streamItems = posts.map( post => ( {
		...keyForPost( post ),
		date: post[ dateProperty ],
		...( post.comments && { comments: map( post.comments, 'ID' ).reverse() } ),
	} ) );

	if ( isPoll ) {
		actions.push( receiveUpdates( { streamKey, streamItems, query } ) );
	} else {
		actions.push( receivePage( { streamKey, query, streamItems, pageHandle, gap } ) );
		actions.push( receivePosts( posts ) );
	}

	return actions;
}

export function handleError() {
	return errorNotice( translate( 'Could not fetch the next page of posts' ) );
}

export default {
	[ READER_STREAMS_PAGE_REQUEST ]: [
		dispatchRequestEx( {
			fetch: requestPage,
			onSuccess: handlePage,
			onError: handleError,
			fromApi,
		} ),
	],
};
