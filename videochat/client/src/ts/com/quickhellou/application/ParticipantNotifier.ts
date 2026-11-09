/**
 * Shows short, non-blocking notices when participants join or leave a call.
 *
 * Notices are rendered into a polite ARIA live region attached to <body>, so
 * they are visible in (body) fullscreen and announced by screen readers.
 *
 * @export
 * @class ParticipantNotifier
 */
export class ParticipantNotifier {
  private static DISPLAY_MS: number = 4000
  private static EXIT_MS: number = 300
  private static MAX_VISIBLE: number = 3

  private container: HTMLElement

  /**
   * Notifies that a participant joined.
   *
   * @param {number} participantCount everyone in the call, including this user
   * @memberof ParticipantNotifier
   */
  public participantJoined(participantCount: number): void {
    this.show('A participant joined', participantCount, 'joined')
  }

  /**
   * Notifies that a participant left.
   *
   * @param {number} participantCount everyone in the call, including this user
   * @memberof ParticipantNotifier
   */
  public participantLeft(participantCount: number): void {
    this.show('A participant left', participantCount, 'left')
  }

  /**
   * Removes all notices and the live region.
   *
   * @memberof ParticipantNotifier
   */
  public destroy(): void {
    if (this.container) {
      this.container.remove()
      this.container = null
    }
  }

  private show(text: string, participantCount: number, kind: string): void {
    const container: HTMLElement = this.getContainer()

    const notice: HTMLElement = document.createElement('div')
    notice.className = `participant-notice participant-notice--${kind}`

    const title: HTMLElement = document.createElement('span')
    title.className = 'participant-notice__title'
    title.textContent = text
    notice.appendChild(title)

    const count: HTMLElement = document.createElement('span')
    count.className = 'participant-notice__count'
    count.textContent = this.describeCount(participantCount)
    notice.appendChild(count)

    container.appendChild(notice)

    while (container.children.length > ParticipantNotifier.MAX_VISIBLE) {
      container.removeChild(container.firstElementChild)
    }

    // Next frame, so the enter transition runs.
    window.requestAnimationFrame(() => {
      notice.classList.add('participant-notice--visible')
    })

    window.setTimeout(() => {
      notice.classList.remove('participant-notice--visible')
      window.setTimeout(() => notice.remove(), ParticipantNotifier.EXIT_MS)
    }, ParticipantNotifier.DISPLAY_MS)
  }

  private describeCount(participantCount: number): string {
    if (participantCount <= 1) {
      return "You're the only one here"
    }
    return `${participantCount} people in the call`
  }

  private getContainer(): HTMLElement {
    if (!this.container || !this.container.isConnected) {
      this.container = document.createElement('div')
      this.container.className = 'participant-notices'
      this.container.setAttribute('role', 'status')
      this.container.setAttribute('aria-live', 'polite')
      document.body.appendChild(this.container)
    }
    return this.container
  }
}
