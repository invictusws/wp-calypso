/** @format */

/**
 * External dependencies
 */
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Gridicon from 'gridicons';
import { localize } from 'i18n-calypso';

/**
 * Internal dependencies
 */
import config from 'config';
import ValidationFieldset from 'signup/validation-fieldset';
import FormTextInput from 'components/forms/form-text-input';
import FormLabel from 'components/forms/form-label';
import FormInputCheckbox from 'components/forms/form-checkbox';
import FormFieldset from 'components/forms/form-fieldset';
import Popover from 'components/popover';
import Button from 'components/button';

export class DropdownFilters extends Component {
	static propTypes = {
		filters: PropTypes.shape( {
			includeDashes: PropTypes.bool,
			maxCharacters: PropTypes.string,
			showExactMatchesOnly: PropTypes.bool,
		} ).isRequired,

		onChange: PropTypes.func.isRequired,
		onReset: PropTypes.func.isRequired,
		onSubmit: PropTypes.func.isRequired,
	};

	state = {
		showPopover: false,
		showOverallValidationError: false,
	};

	constructor( props ) {
		super( props );
		this.button = React.createRef();
	}

	togglePopover = () => {
		this.setState( {
			showPopover: ! this.state.showPopover,
		} );
	};

	getFiltercounts() {
		return (
			( this.props.filters.includeDashes && 1 ) +
			( this.props.filters.showExactMatchesOnly && 1 ) +
			( this.props.filters.maxCharacters !== '' && 1 )
		);
	}

	getMaxCharactersValidationErrors() {
		const { filters: { maxCharacters }, translate } = this.props;
		const isValid = /^-?\d*$/.test( maxCharacters );
		return ! isValid ? [ translate( 'Value must be a whole number' ) ] : null;
	}

	getOverallValidationErrors() {
		const isValid = this.getMaxCharactersValidationErrors() === null;
		const { showOverallValidationError } = this.state;
		return ! isValid && showOverallValidationError
			? [ this.props.translate( 'Please correct any errors above' ) ]
			: null;
	}

	hasValidationErrors() {
		return this.getOverallValidationErrors() !== null;
	}

	updateFilterValues = ( name, value ) => {
		const newFilters = {
			...this.props.filters,
			[ name ]: value,
		};
		this.props.onChange( newFilters );
	};

	handleOnChange = event => {
		const { currentTarget } = event;
		if ( currentTarget.type === 'checkbox' ) {
			this.updateFilterValues( currentTarget.name, currentTarget.checked );
		} else if ( currentTarget.type === 'number' ) {
			window.currentTarget = currentTarget;
			this.updateFilterValues( currentTarget.name, currentTarget.value );
		}
	};

	handleFiltersReset = () => {
		this.setState( { showOverallValidationError: false }, () => {
			this.togglePopover();
			this.props.onReset( 'includeDashes', 'maxCharacters', 'showExactMatchesOnly' );
		} );
	};
	handleFiltersSubmit = () => {
		if ( this.hasValidationErrors() ) {
			this.setState( { showOverallValidationError: true } );
			return;
		}

		this.setState( { showOverallValidationError: false }, () => {
			this.togglePopover();
			this.props.onSubmit();
		} );
	};

	render() {
		const hasFilterValues = this.getFiltercounts() > 0;
		return (
			<div
				className={ classNames( 'search-filters__dropdown-filters', {
					'search-filters__dropdown-filters--has-filter-values': hasFilterValues,
				} ) }
			>
				<Button borderless ref={ this.button } onClick={ this.togglePopover }>
					<Gridicon icon="list-unordered" />
				</Button>

				{ this.state.showPopover && this.renderPopover() }
			</div>
		);
	}

	renderPopover() {
		const {
			filters: { includeDashes, maxCharacters, showExactMatchesOnly },
			translate,
		} = this.props;

		const isDashesFilterEnabled = config.isEnabled( 'domains/kracken-ui/dashes-filter' );
		const isExactMatchFilterEnabled = config.isEnabled( 'domains/kracken-ui/exact-match-filter' );
		const isLengthFilterEnabled = config.isEnabled( 'domains/kracken-ui/max-characters-filter' );

		return (
			<Popover
				autoPosition={ false }
				className="search-filters__popover"
				context={ this.button.current }
				isVisible={ this.state.showPopover }
				onClose={ this.togglePopover }
				position="bottom left"
			>
				{ isLengthFilterEnabled && (
					<ValidationFieldset
						className="search-filters__text-input-fieldset"
						errorMessages={ this.getMaxCharactersValidationErrors() }
					>
						<FormLabel className="search-filters__label" htmlFor="search-filters-max-characters">
							{ translate( 'Max Characters' ) }:
						</FormLabel>
						<FormTextInput
							className="search-filters__input"
							id="search-filters-max-characters"
							min="1"
							name="maxCharacters"
							onChange={ this.handleOnChange }
							placeholder="14"
							type="number"
							value={ maxCharacters }
						/>
					</ValidationFieldset>
				) }

				<FormFieldset className="search-filters__checkboxes-fieldset">
					{ isExactMatchFilterEnabled && (
						<FormLabel
							className="search-filters__label"
							htmlFor="search-filters-show-exact-matches-only"
						>
							<FormInputCheckbox
								className="search-filters__checkbox"
								checked={ showExactMatchesOnly }
								id="search-filters-show-exact-matches-only"
								name="showExactMatchesOnly"
								onChange={ this.handleOnChange }
								value="showExactMatchesOnly"
							/>
							<span className="search-filters__checkbox-label">
								{ translate( 'Show exact matches only' ) }
							</span>
						</FormLabel>
					) }

					{ isDashesFilterEnabled && (
						<FormLabel className="search-filters__label" htmlFor="search-filters-include-dashes">
							<FormInputCheckbox
								className="search-filters__checkbox"
								checked={ includeDashes }
								id="search-filters-include-dashes"
								name="includeDashes"
								onChange={ this.handleOnChange }
								value="includeDashes"
							/>
							<span className="search-filters__checkbox-label">
								{ translate( 'Enable dashes' ) }
							</span>
						</FormLabel>
					) }
				</FormFieldset>

				<ValidationFieldset
					className="search-filters__buttons-fieldset"
					errorMessages={ this.getOverallValidationErrors() }
				>
					<div className="search-filters__buttons">
						<Button onClick={ this.handleFiltersReset }>{ translate( 'Reset' ) }</Button>
						<Button primary onClick={ this.handleFiltersSubmit }>
							{ translate( 'Apply' ) }
						</Button>
					</div>
				</ValidationFieldset>
			</Popover>
		);
	}
}

export default localize( DropdownFilters );
