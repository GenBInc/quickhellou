export class HTMLTemplates {
    public static getRemoteMessageHTML(message: string): string {
        return `<div class="text-chat-window__message text-chat-window__message--incoming">
          <div class="df df-lt text-chat-window__message-content-wrap text-chat-window__message-content-wrap--incoming">
            <div class="df text-chat-window__message-icon-wrap">
            </div>
            <div class="df df-f1 text-chat-window__message-content text-chat-window__message-content--incoming">
            ${message.trim()}</div>
          </div>
        </div>`;
    }

    public static getLocalMessageHTML(message: string): string {
        return `<div class="text-chat-window__message text-chat-window__message--outgoing">
        <div class="df df-lt text-chat-window__message-content-wrap text-chat-window__message-content-wrap--outgoing">
          <div class="df df-c  text-chat-window__message-icon-wrap text-chat-window__message-icon-wrap--outcoming">
            <img class="text-chat-window__message-icon" src="/static/images/user.svg" alt="">
          </div>
          <div class="df df-f1 text-chat-window__message-content text-chat-window__message-content--outgoing">
            <div>${message.trim()}</div>
          </div>
        </div>
      </div>`;
    }
}