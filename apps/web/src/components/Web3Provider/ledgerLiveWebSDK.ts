import { LedgerLiveEthereumProvider } from './ledgerLiveEthereumProvider'

export declare type RequestArguments = {
  /** The RPC method to request. */
  method: string
  /** The params of the RPC method, if any. */
  params?: unknown[] | Record<string, unknown>
}

function htmlToNode(html: string) {
  const template = document.createElement('template')
  template.innerHTML = html
  const nNodes = template.content.childNodes.length
  if (nNodes !== 1) {
    throw new Error(
      `html parameter must represent a single node; got ${nNodes}. ` +
        'Note that leading or trailing spaces around an element in your ' +
        'HTML, like " <img/> ", get parsed as text nodes neighbouring ' +
        'the element; call .trim() on your input to avoid this.',
    )
  }
  return template.content.childNodes[0] as HTMLDialogElement
}

function addStyle(styleString: string) {
  const style = document.createElement('style')
  style.textContent = styleString
  document.head.append(style)
}

export class LedgerLiveWebSDK {
  provider?: LedgerLiveEthereumProvider
  dialog?: HTMLDialogElement
  iframe?: HTMLIFrameElement
  iframeIsRendered = false

  send({ type, data }: { type: string; data?: Record<string, unknown> }) {
    if (this.iframeIsRendered) {
      this.iframe?.contentWindow?.postMessage(
        {
          type,
          data,
        },
        '*',
      )
    } else {
      console.error('iFrameNotRendered')
    }
  }

  listener(event: MessageEvent) {
    const { data: content } = event
    switch (content.type) {
      case 'open':
        this.dialog?.showModal()
        break

      case 'close':
        this.dialog?.close()
    }
  }

  init() {
    addStyle(`
      .modal {
        width: 100%;
        display: none;
        justify-content: center;
        padding: 0;
        background-color: transparent;
        border: none;

        background-color: transparent;
        transition-duration: 200ms;
        transition-timing-function: cubic-bezier(0, 0, 0.2, 1);
        color: inherit;
        transition-property: transform, opacity, visibility;
        overflow-y: hidden;
        overscroll-behavior: contain;
        &:not(dialog:not(.modal-open)),
        &::backdrop {
          background-color: #0006;
          animation: modal-pop 0.2s ease-out;
        }
      }
      .modal-backdrop {
        z-index: -1;
        display: grid
        grid-column-start: 1;
        grid-row-start: 1;
        justify-self: stretch;
        align-self: stretch;
        color: transparent;
      }
      .modal-box {
        overflow: hidden;
        padding: 0;
        border-radius: 0.25rem;
        user-select: none;
        aspect-ratio: 2/3;

        grid-column-start: 1;
        grid-row-start: 1;
        width: 91.666667%;
        max-width: 32rem;
        transition-property: background-color, border-color, color, fill, stroke, opacity, box-shadow, transform;
        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        transition-duration: 300ms;
        transition-duration: 200ms;
        transition-timing-function: cubic-bezier(0, 0, 0.2, 1);
        --transform-scale-x: .9;
        --transform-scale-y: .9;
        box-shadow: rgba(0, 0, 0, 0.25) 0px 25px 50px -12px;
        overflow-y: auto;
        overscroll-behavior: contain;
      }
      .modal[open] {
        display: flex;
      }
      .modal-open .modal-box,
      .modal-toggle:checked + .modal .modal-box,
      .modal:target .modal-box,
      .modal[open] .modal-box {
        --transform-scale-x: 1;
        --transform-scale-y: 1;
        --transform-translate-y: 0;
      }
      .modal-action {
        margin-top: 1.5rem;
        margin-left: 0.5rem;
        justify-content: flex-end;
      }
      @keyframes modal-pop {
        0% {
          opacity: 0;
        }
      }
      .llw-iframe {
        width: 100%;
        height: 100%;
        user-select: none;
        border: none;
      }
    `)
    this.dialog = htmlToNode(
      `<dialog id="llw-dialog" class="modal">
        <div class="modal-box">
          <iframe id="llw-iframe" class="llw-iframe" src="http://localhost:1234/connect" sandbox="allow-forms allow-popups allow-scripts allow-same-origin" allow="publickey-credentials-get *; hid; usb; bluetooth;" name="iframe-ledger" loading="eager"></iframe>
        </div>
      </dialog>`
        .split('\n')
        .reduce((acc, s) => acc + s.trim(), ''),
    )

    this.iframe = this.dialog.childNodes[0].childNodes[0] as HTMLIFrameElement

    document.body.appendChild(this.dialog)

    this.provider = new LedgerLiveEthereumProvider({ eventTarget: this.iframe.contentWindow ?? undefined })

    window.addEventListener('message', this.listener.bind(this))

    return new Promise<void>((resolve) => {
      const handlerInit = (event: MessageEvent) => {
        const { data: content } = event
        if (content.type === 'rendered') {
          window.removeEventListener('message', handlerInit)
          this.iframeIsRendered = true
          resolve()
        }
      }

      window.addEventListener('message', handlerInit)
    })
  }
  connect() {
    this.send({ type: 'connect' })

    this.dialog?.close()

    return new Promise((resolve, reject) => {
      const handlerConnect = (event: MessageEvent) => {
        const { data: content } = event
        if (content.type === 'connect:response') {
          window.removeEventListener('message', handlerConnect)
          resolve([content.data.address])
        } else if (content.type === 'error') {
          window.removeEventListener('message', handlerConnect)
          reject(content.data.error)
        }
      }

      window.addEventListener('message', handlerConnect)
    })
    // emit connect event on provider
  }
  async terminate() {
    // window.removeEventListener('message', this.listener)
    // this.dialog?.remove()
  }
  getProvider() {
    return this.provider!
  }
}
