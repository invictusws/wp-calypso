/** @format */

/**
 * External dependencies
 */
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { pick, noop } from 'lodash';

/**
 * Internal dependencies
 */
import MoreFiltersControl from './more-filters';

export default class SearchFilters extends Component {
	static propTypes = {
		filters: PropTypes.shape( {
			includeDashes: PropTypes.bool,
			maxCharacters: PropTypes.string,
			showExactMatchesOnly: PropTypes.bool,
			tlds: PropTypes.arrayOf( PropTypes.string ),
		} ).isRequired,
		availableTlds: PropTypes.arrayOf( PropTypes.string ),
		onChange: PropTypes.func,
		onFiltersReset: PropTypes.func,
		onFiltersSubmit: PropTypes.func,
	};

	static defaultProps = {
		onChange: noop,
		onFiltersReset: noop,
		onFiltersSubmit: noop,
	};

	updateFilterValues = ( name, value ) => {
		this.props.onChange( {
			[ name ]: value,
		} );
	};

	render() {
		return (
			<div className="search-filters">
				<MoreFiltersControl
					{ ...pick( this.props.filters, [
						'includeDashes',
						'maxCharacters',
						'showExactMatchesOnly',
					] ) }
					onChange={ this.updateFilterValues }
					{ ...pick( this.props, [ 'onFiltersReset', 'onFiltersSubmit' ] ) }
				/>
			</div>
		);
	}
}
