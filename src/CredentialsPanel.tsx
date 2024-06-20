import { PanelLayout, Widget } from '@lumino/widgets';

import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';

import { ServiceManager } from '@jupyterlab/services';
import { CredentialsWidget } from './CredentialsWidget';

// The class name added to the extension, this class ensures the background to be white
const CLASS_NAME = 'jp-FileBrowser';

export class CredentialsPanel extends Widget {
  private toolbar: Toolbar<Widget>;
  readonly serviceManager: ServiceManager.IManager;
  private _id: string;
  public get id(): string {
    return this._id;
  }
  public set id(value: string) {
    this._id = value;
  }
  public onAddCredential: () => void;
  public onSave: () => void;
  public onLogin: () => void;
  public onStop: () => void;

  constructor(options: CredentialsPanel.IOptions) {
    super();

    this.serviceManager = options.serviceManager;
    this.id = options.id;

    this.addClass(CLASS_NAME);

    this.toolbar = new Toolbar<Widget>();

    this.setSaveListener = this.setSaveListener.bind(this);
    const saveButton = new ToolbarButton({
      iconClass: 'jp-SaveIcon jp-Icon jp-Icon-16',
      tooltip: 'Save',
      onClick: () => this.onSave()
    });

    this.setAddCredentialListener = this.setAddCredentialListener.bind(this);
    const newCredential = new ToolbarButton({
      iconClass: 'jp-AddIcon jp-Icon jp-Icon-16',
      tooltip: 'New Credential',
      onClick: () => this.onAddCredential()
    });

    this.setLoginListener = this.setLoginListener.bind(this);
    // const loginButton = new ToolbarButton({
    //   iconClass: 'jp-KeyIcon jp-Icon jp-Icon-16',
    //   tooltip: 'Login',
    //   onClick: () => {
    //     this.onLogin();
    //     this.layout?.removeWidget(this.toolbar);
    //     this.toolbar = new Toolbar<Widget>();
    //     this.toolbar.addItem('stopButton', stopButton);
    //     this.toolbar.addItem('newCredential', newCredential);
    //     this.toolbar.addItem('saveButton', saveButton);
    //     layout.insertWidget(0, this.toolbar);
    //   }
    // });
    // this.toolbar.addItem('loginButton', loginButton);
    this.toolbar.addItem('newCredential', newCredential);
    this.toolbar.addItem('saveButton', saveButton);
    this.setStopListener = this.setStopListener.bind(this);
    // const stopButton = new ToolbarButton({
    //   iconClass: 'jp-StopIcon jp-Icon jp-Icon-16',
    //   tooltip: 'Stop',
    //   onClick: () => {
    //     this.onStop();
    //     this.layout?.removeWidget(this.toolbar);
    //     this.toolbar = new Toolbar<Widget>();
    //     this.toolbar.addItem('loginButton', loginButton);
    //     layout.insertWidget(0, this.toolbar);
    //   }
    // });

    const layout = new PanelLayout();
    layout.addWidget(this.toolbar);
    layout.insertWidget(0, this.toolbar);

    layout.addWidget(
      new CredentialsWidget({
        serviceManager: options.serviceManager,
        setSaveListener: this.setSaveListener,
        setAddCredentialListener: this.setAddCredentialListener,
        setLoginListener: this.setLoginListener,
        setStopListener: this.setStopListener
      })
    );

    this.layout = layout;
  }

  setAddCredentialListener(onAddCredential: () => void) {
    this.onAddCredential = onAddCredential;
  }

  setSaveListener(onSave: () => void) {
    this.onSave = onSave;
  }

  setLoginListener(onLogin: () => void) {
    this.onLogin = onLogin;
  }

  setStopListener(onStop: () => void) {
    this.onStop = onStop;
  }
}

// The namespace for the `CredentialsPanel` class statics.
export namespace CredentialsPanel {
  export interface IOptions {
    // The widget/DOM id of the credential-panel.
    id: string;

    // provides access to service, like sessions
    serviceManager: ServiceManager.IManager;
  }
}
