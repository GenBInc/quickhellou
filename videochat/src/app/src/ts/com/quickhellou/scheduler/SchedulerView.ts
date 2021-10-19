import * as Pikaday from 'pikaday';
import { HTMLUtils } from '../../genb/base/utils/HTMLUtils';
import { StringUtils } from '../../genb/base/utils/StringUtils';
import { DateUtils } from '../../genb/base/utils/DateUtils';
import { DateTime } from './DateTime';
import { SendInvitationValidator } from './SendInvitationValidator';
import { InvitationSubmitter } from './InvitationSubmitter';
import { Invitation } from './model/Invitation';
import { InvitationSubmitterEvent } from './InvitationSubmitterEvent';
import { HTMLComponent } from '../../genb/base/components/HtmlComponent';
import { BaseUtils } from '../../genb/base/utils/BaseUtils';
import { Util } from '../Util';

/**
 * Scheduler view.
 *
 * @export
 * @class Scheduler
 * @extends {HTMLComponent}
 */
export class SchedulerView extends HTMLComponent {
	private picker: Pikaday;
	private dateTime: DateTime;

	/**
	 * Creates an instance of Scheduler.
	 *
	 * @memberof Scheduler
	 */
	constructor(element: HTMLElement) {
		super(element);
		this.dateTime = new DateTime();
		this.initCalendar();
		this.initSendInvation();

		const setupQuickTalkElement: HTMLLinkElement = HTMLUtils.get('.button--setup-quick-talk') as HTMLLinkElement;
		if (BaseUtils.isObjectDefined(setupQuickTalkElement)) {
			setupQuickTalkElement.href = `/r/${Util.randomString(9)}/setup`;
		}
	}

	private initCalendar(): void {
		this.populateTimeHTMLElements();
		this.initTimeEvents();
		const now: Date = new Date();
		this.picker = new Pikaday({
			field: HTMLUtils.get("input[name='date']"),
			bound: false,
			minDate: now,
			container: HTMLUtils.get('.calendar__picker'),
			onSelect: (date: Date): void => {
				this.dateSelectHandler(date);
			},
		});

		//this.initWithCurrentTime();
	}

	private dateSelectHandler(date: Date): void {
		this.updateHighLightedDateElements(date);

		this.dateTime.setDateString(DateUtils.toLocalShortString(date));

		const hoursList: HTMLElement = HTMLUtils.get('.hours__list');
		hoursList.focus();
	}

	private initTimeEvents(): void {
		const hourEntries: NodeListOf<HTMLElement> = HTMLUtils.list('.hour-entry');
		for (let index: number = 0; index < hourEntries.length; index++) {
			const hourEntry: HTMLElement = hourEntries.item(index);
			hourEntry.addEventListener('click', (event: MouseEvent): void => {
				this.hourEntryClickHandler(event);
			});
		}

		const minuteEntries: NodeListOf<HTMLElement> = HTMLUtils.list('.minute-entry');
		for (let index: number = 0; index < minuteEntries.length; index++) {
			const minuteEntry: HTMLElement = minuteEntries.item(index);
			minuteEntry.addEventListener('click', (event: MouseEvent): void => {
				this.minuteEntryClickHandler(event);
			});
		}
	}

	private hourEntryClickHandler(event: MouseEvent): void {
		const target: HTMLElement = event.currentTarget as HTMLElement;
		this.dateTime.setHour(Number(target.innerHTML));
		this.updateTimeHTMLElements();
		this.selectHourEntryElement(target);
	}

	private minuteEntryClickHandler(event: MouseEvent): void {
		const target: HTMLElement = event.currentTarget as HTMLElement;
		this.dateTime.setMinute(Number(target.innerHTML));
		this.updateTimeHTMLElements();
		this.selectMinuteEntryElement(target);
	}

	private removeEntryElementsSelection(selector: string): void {
		const hourEntries: Array<HTMLElement> = HTMLUtils.array(selector);
		hourEntries.forEach((hourEntry: HTMLElement): void => {
			hourEntry.classList.remove('js-active');
		});
	}

	private selectHourEntryElement(hourEntryElement: HTMLElement): void {
		this.removeEntryElementsSelection('.hour-entry');
		hourEntryElement.classList.add('js-active');
	}

	private selectMinuteEntryElement(minuteEntryElement: HTMLElement): void {
		this.removeEntryElementsSelection('.minute-entry');
		minuteEntryElement.classList.add('js-active');
	}

	private removeTimeEntryElementsSelection(): void {
		this.removeEntryElementsSelection('.hour-entry');
		this.removeEntryElementsSelection('.minute-entry');
	}

	private updateTimeHTMLElements(): void {
		if (!this.dateTime.isFullTime) return;

		const timeHighlightElement: HTMLElement = HTMLUtils.get('.highlight__time');
		timeHighlightElement.innerHTML = this.dateTime.timeToString();
	}

	private populateTimeHTMLElements(): void {
		this.populateHoursHTMLElements();
		this.populateMinutesHTMLElements();
	}

	private populateHoursHTMLElements(): void {
		const hoursListElement: HTMLElement = HTMLUtils.get('.hours__list');
		for (let index: number = 0; index <= 23; index++) {
			const n: string = String(index);
			const hourTemplateElement: string = `<div class="time-entry hour-entry">${n.replace(
				/^\d{1}$/g,
				'0$&'
			)}</div>`;
			hoursListElement.innerHTML += hourTemplateElement;
		}
	}
	private populateMinutesHTMLElements(): void {
		const minutesListElement: HTMLElement = HTMLUtils.get('.minutes__list');
		for (let index: number = 0; index <= 59; index++) {
			const n: string = String(index);
			const minuteTemplateElement: string = `<div class="time-entry minute-entry">${n.replace(
				/^\d{1}$/g,
				'0$&'
			)}</div>`;
			minutesListElement.innerHTML += minuteTemplateElement;
		}
	}

	private initWithCurrentTime(): void {
		const now: Date = new Date();
		this.updateHighLightedDateElements(now);
	}

	private updateHighLightedDateElements(date: Date) {
		const hightlightYearElement: HTMLElement = HTMLUtils.get('.highlight__year');
		const year: number = date.getFullYear();
		hightlightYearElement.innerHTML = String(year);

		const hightlightDateElement: HTMLElement = HTMLUtils.get('.highlight__date');
		hightlightDateElement.innerHTML = DateUtils.toLocalShortString(date);
	}

	private initSendInvation(): void {
		const sendInvitationButton: HTMLButtonElement = HTMLUtils.get('.scheduler__submit') as HTMLButtonElement;
		sendInvitationButton.addEventListener('click', (event: MouseEvent): void => {
			event.preventDefault();
			this.submitHandler(event);
		});
	}

	private submitHandler(event: MouseEvent): void {
		if (this.isDataValid) this.submitInvitation();
		else this.handleInvitationErrors();
	}

	private submitInvitation(): void {
		this.hideErrorMessageElements();
		const submitter: InvitationSubmitter = new InvitationSubmitter(this.invitation);
		submitter.addEventListener(
			InvitationSubmitterEvent.INVITATION_SENT,
			(resolve: string): void => {
				this.invitationSentHandler(resolve);
			},
			this
		);
		submitter.addEventListener(
			InvitationSubmitterEvent.INVITATION_ERROR,
			(reason: string): void => {
				this.invitationSendingErrorHandler(reason);
			},
			this
		);
		submitter.submit();
	}

	private invitationSentHandler(resolve: string): void {
		const formViewElement: HTMLElement = HTMLUtils.get('.form--scheduler');
		formViewElement.classList.remove('active');
		const formSentViewElement: HTMLElement = HTMLUtils.get('.overlay--scheduler__result');
		formSentViewElement.classList.add('js-active');

		const goBackButtonElement: HTMLButtonElement = HTMLUtils.get(
			'.overlay--scheduler__result-ok'
		) as HTMLButtonElement;
		goBackButtonElement.addEventListener('click', (event: MouseEvent): void => {
			this.goBackToFormView(event);
		});

		const sendInvitationBodyElement: HTMLElement = HTMLUtils.get('.overlay--scheduler__body');
		sendInvitationBodyElement.classList.add('hidden');

		const sendInvitationResultElement: HTMLElement = HTMLUtils.get('.overlay--scheduler__result');
		sendInvitationResultElement.classList.remove('hidden');

		let sendInvitationResultMessageElement: HTMLElement = HTMLUtils.get('.overlay--scheduler__result-message');
		sendInvitationResultMessageElement.classList.remove('js-error');
		sendInvitationResultMessageElement.innerHTML = resolve;
	}

	private goBackToFormView(event: MouseEvent): void {
		this.reset();
		const formViewElement: HTMLElement = HTMLUtils.get('.form--scheduler');
		formViewElement.classList.add('js-active');
		formViewElement.classList.remove('hidden');
		const formSentViewElement: HTMLElement = HTMLUtils.get('.overlay--scheduler__result');
		formSentViewElement.classList.remove('js-active');
		formSentViewElement.classList.add('hidden');
	}

	private reset(): void {
		const emailInput: HTMLInputElement = HTMLUtils.get('.form--scheduler__input--email') as HTMLInputElement;
		emailInput.value = StringUtils.EMPTY;
		const descriptionInput: HTMLTextAreaElement = HTMLUtils.get(
			"textarea[name='description']"
		) as HTMLTextAreaElement;
		descriptionInput.value = StringUtils.EMPTY;
		const googleCalendarCheckbox: HTMLInputElement = HTMLUtils.input('.googleCalendar');
		googleCalendarCheckbox.checked = false;
		this.dateTime.reset();
		this.removeTimeEntryElementsSelection();
		this.removeDateSelection();
		this.clearDateTimeHighlight();
	}

	private removeDateSelection(): void {
		this.picker.setDate(null);
	}

	private clearDateTimeHighlight(): void {
		const hightlightYearElement: HTMLElement = HTMLUtils.get('.highlight__year');
		hightlightYearElement.innerHTML = StringUtils.EMPTY;

		const hightlightTimeElement: HTMLElement = HTMLUtils.get('.highlight__time');
		hightlightTimeElement.innerHTML = StringUtils.EMPTY;

		const hightlightDateElement: HTMLElement = HTMLUtils.get('.highlight__date');
		hightlightDateElement.innerHTML = StringUtils.EMPTY;
	}

	private invitationSendingErrorHandler(reason: String): void {
		console.error(reason);
	}

	private hideErrorMessageElements(): void {
		const errorElements: Array<HTMLElement> = HTMLUtils.array('.error');
		errorElements.forEach((errorElement: HTMLElement) => {
			errorElement.classList.remove('js-active');
		});
	}

	private handleInvitationErrors(): void {
		this.hideErrorMessageElements();

		this.validator.errors.forEach((error) => {
			const errorElement: HTMLElement = HTMLUtils.get(`p[data-error='${error}']`);
			errorElement.classList.add('js-active');
		});
	}

	private get invitation(): Invitation {
		let invitation: Invitation = new Invitation();
		invitation.dateTime = this.dateTime.toString();
		const emailInput: HTMLInputElement = HTMLUtils.input('.form--scheduler__input--email');
		invitation.email = emailInput.value;
		const descriptionInput: HTMLTextAreaElement = HTMLUtils.get(
			'.form--scheduler__textarea--description'
		) as HTMLTextAreaElement;
		invitation.description = descriptionInput.value;
		const googleCalendarCheckbox: HTMLInputElement = HTMLUtils.input('.googleCalendar');
		if (googleCalendarCheckbox.checked) {
			const pickerDate: Date = this.picker.getDate();
			if (BaseUtils.isObjectDefined(pickerDate)) {
				const date: string = this.picker.getDate().toLocaleDateString('en-US');
				const timeDate: Date = new Date();
				timeDate.setMinutes(this.dateTime.getMinutes());
				timeDate.setHours(this.dateTime.getHours());
				const time: string = timeDate.toLocaleTimeString('en-US');
				invitation.calendar = this.createGoogleCalendarFileData(date, time, descriptionInput.value.trim());
				invitation.attachCalendar = true;
			}
		}
		return invitation;
	}

	private createGoogleCalendarFileData(startDate: string, startTime: string, description: string): string {
		return `Subject, Start Date, Start Time, Description\nSetup Quick Talk,${startDate},${startTime},${description}`;
	}

	private get validator(): SendInvitationValidator {
		return new SendInvitationValidator(this.dateTime, this.invitation);
	}

	private get isDataValid(): boolean {
		return this.validator.isValid;
	}
}
