import { LitElement, css, html } from "lit";

export class PageLayout_HeaderSidebar extends LitElement {

    static styles = [
        css``
    ];

    protected render(): unknown {
        return html``;
    }
}

declare global {
    interface HTMLElementTagNameMap {
      "layout-page-header-sidebar": PageLayout_HeaderSidebar;
    }
  }

customElements.define('page-layout-header-with-sidebar', PageLayout_HeaderSidebar);