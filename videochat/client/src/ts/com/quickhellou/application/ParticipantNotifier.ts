type NoticeKind = 'joined' | 'left'

/**
 * Shows short, non-blocking notices when participants (including this user)
 * join or leave a call.
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

  /** Another participant joined. */
  public participantJoined(participantCount: number): void {
    this.show('joined', 'A participant joined', this.describeCount(participantCount))
  }

  /** Another participant left. */
  public participantLeft(participantCount: number): void {
    this.show('left', 'A participant left', this.describeCount(participantCount))
  }

  /** This user joined the call. */
  public youJoined(participantCount: number): void {
    const detail: string =
      participantCount <= 1
        ? 'Waiting for others to join'
        : this.describeCount(participantCount)
    this.show('joined', 'You joined the call', detail)
  }

  /** This user hung up. */
  public youLeft(): void {
    this.show('left', 'You left the call')
  }

  /** This user's connection to the call was lost. */
  public youWereDisconnected(): void {
    this.show('left', 'You were disconnected')
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

  private show(kind: NoticeKind, text: string, detail?: string): void {
    const container: HTMLElement = this.getContainer()

    const notice: HTMLElement = document.createElement('div')
    notice.className = `participant-notice participant-notice--${kind}`

    const title: HTMLElement = document.createElement('span')
    title.className = 'participant-notice__title'
    title.textContent = text
    notice.appendChild(title)

    if (detail) {
      const count: HTMLElement = document.createElement('span')
      count.className = 'participant-notice__detail'
      count.textContent = `· ${detail}`
      notice.appendChild(count)
    }

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
