/** @format */

/**
 * External dependencies
 */
import classNames from 'classnames';
import PropTypes from 'prop-types';
import Gridicon from 'gridicons';
import React, { Component } from 'react';
import { includes } from 'lodash';
import { localize } from 'i18n-calypso';

/**
 * Internal dependencies
 */
import Button from 'components/button';
import CompactCard from 'components/card/compact';
import FormFieldset from 'components/forms/form-fieldset';
import Popover from 'components/popover';
import TokenField from 'components/token-field';

export class TldFilterBar extends Component {
	static propTypes = {
		availableTlds: PropTypes.arrayOf( PropTypes.string ).isRequired,
		filters: PropTypes.shape( {
			tlds: PropTypes.arrayOf( PropTypes.string ).isRequired,
		} ),
		lastFilters: PropTypes.shape( {
			tlds: PropTypes.arrayOf( PropTypes.string ).isRequired,
		} ),
		numberOfTldsShown: PropTypes.number,
		onChange: PropTypes.func.isRequired,
		onReset: PropTypes.func.isRequired,
		onSubmit: PropTypes.func.isRequired,
		showPlaceholder: PropTypes.bool.isRequired,
	};

	static defaultProps = {
		numberOfTldsShown: 8,
	};

	state = {
		showPopover: false,
	};

	bindButton = button => ( this.button = button );

	handleButtonClick = event => {
		const isCurrentlySelected = event.currentTarget.dataset.selected === 'true';
		const newTld = event.currentTarget.value;

		const tldSet = new Set( [ ...this.props.filters.tlds, newTld ] );
		if ( isCurrentlySelected ) {
			tldSet.delete( newTld );
		}

		const tlds = [ ...tldSet ];
		this.props.onChange( { tlds }, { shouldSubmit: true } );
	};
	handleFiltersReset = () => {
		this.togglePopover();
		this.props.onReset( 'tlds' );
	};
	handleFiltersSubmit = () => {
		this.togglePopover();
		this.props.onSubmit();
	};
	handleTokenChange = newTlds => {
		this.props.onChange(
			{ tlds: newTlds.filter( tld => includes( this.props.availableTlds, tld ) ) },
			{ shouldSubmit: true }
		);
	};

	togglePopover = () => {
		this.setState( {
			showPopover: ! this.state.showPopover,
		} );
	};

	render() {
		if ( this.props.showPlaceholder ) {
			return this.renderPlaceholder();
		}

		const {
			availableTlds,
			filters: { tlds },
			lastFilters: { tlds: selectedTlds },
			translate,
			numberOfTldsShown,
		} = this.props;
		const hasFilterValue = tlds.length > 0;

		return (
			<CompactCard className="search-filters__buttons">
				{ availableTlds.slice( 0, numberOfTldsShown ).map( tld => (
					<Button
						className={ classNames( { 'is-active': includes( selectedTlds, tld ) } ) }
						data-selected={ includes( selectedTlds, tld ) }
						key={ tld }
						onClick={ this.handleButtonClick }
						value={ tld }
					>
						.{ tld }
					</Button>
				) ) }
				<Button
					className={ classNames( { 'is-active': hasFilterValue } ) }
					onClick={ this.togglePopover }
					ref={ this.bindButton }
					key="popover-button"
				>
					{ translate( 'More Extensions', {
						context: 'TLD filter button',
						comment: 'Refers to top level domain name extension, such as ".com"',
					} ) }
					<Gridicon icon="chevron-down" size={ 24 } />
				</Button>

				{ this.state.showPopover && this.renderPopover() }
			</CompactCard>
		);
	}

	renderPopover() {
		const { filters: { tlds }, translate } = this.props;

		return (
			<Popover
				autoPosition={ false }
				className="search-filters__popover"
				context={ this.button }
				isVisible={ this.state.showPopover }
				onClose={ this.togglePopover }
				position="bottom left"
			>
				<FormFieldset className="search-filters__token-field-fieldset">
					<TokenField
						isExpanded
						onChange={ this.handleOnChange }
						placeholder={ translate( 'Select an extension' ) }
						suggestions={ this.props.availableTlds }
						tokenizeOnSpace
						value={ tlds }
					/>
				</FormFieldset>
				<FormFieldset className="search-filters__buttons-fieldset">
					<div className="search-filters__buttons">
						<Button onClick={ this.handleFiltersReset }>{ translate( 'Reset' ) }</Button>
						<Button primary onClick={ this.handleFiltersSubmit }>
							{ translate( 'Apply' ) }
						</Button>
					</div>
				</FormFieldset>
			</Popover>
		);
	}

	renderPlaceholder() {
		return (
			<CompactCard className="search-filters__buttons">
				{ [ ...Array( this.props.numberOfTldsShown ) ].map( ( undef, index ) => (
					<Button className="search-filters__button--is-placeholder" key={ index } disabled />
				) ) }
			</CompactCard>
		);
	}
}
export default localize( TldFilterBar );
