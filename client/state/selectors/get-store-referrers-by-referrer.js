/** @format */

/**
 * External dependencies
 */
import { find } from 'lodash';

/**
 * Internal dependencies
 */

import { getSiteStatsNormalizedData } from 'state/stats/lists/selectors';

export default function( state, { siteId, statType, query, selectedReferrer } ) {
	const rawData = getSiteStatsNormalizedData( state, siteId, statType, query );
	return rawData.map( d => {
		const { data, ...props } = d;
		const referrerData = selectedReferrer
			? find( data, r => r.referrer === selectedReferrer ) || {}
			: {};
		return {
			...props,
			...referrerData,
			period: props.date,
		};
	} );
}
