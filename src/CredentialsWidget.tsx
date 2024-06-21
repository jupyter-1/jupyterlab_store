import { SessionContext } from '@jupyterlab/apputils';

declare let require: any;
const CryptoJS = require('crypto-js');

import { Widget } from '@lumino/widgets';

import { Message } from '@phosphor/messaging';
import { ServiceManager, KernelMessage } from '@jupyterlab/services';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { createStore, combineReducers, compose, applyMiddleware } from 'redux';

import CredentialsList from './CredentialsList';

import { ICredential } from './ducks/credentials';

import credentialsReducer from './ducks/credentials';
import tokenReducer from './ducks/token';
import { KernelModel } from './KernelModel';

// TODO: this should be connected to the Jupyter-Model / Data
const json = '';
const data = json.length > 0 ? JSON.parse(json) : {};

const rootReducer = combineReducers({
  credentialsReducer,
  tokenReducer
});

const logger = ({ getState }) => {
  return next => action => {
    const returnValue = next(action);
    // const state: string = JSON.stringify(getState());
    return returnValue;
  };
};

const store = createStore(rootReducer, data, compose(applyMiddleware(logger)));

function encrypt(msgString, token) {
  token = CryptoJS.enc.Utf8.parse(token.substring(0, 16));

  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(msgString, token, {
    iv: iv
  });
  return iv.concat(encrypted.ciphertext).toString(CryptoJS.enc.Base64);
}

function decrypt(ciphertextStr, token) {
  token = CryptoJS.enc.Utf8.parse(token.substring(0, 16));

  const ciphertext = CryptoJS.enc.Base64.parse(ciphertextStr);

  // split IV and ciphertext
  const iv = ciphertext.clone();
  iv.sigBytes = 16;
  iv.clamp();
  ciphertext.words.splice(0, 4); // delete 4 words = 16 bytes
  ciphertext.sigBytes -= 16;

  // decryption
  const decrypted = CryptoJS.AES.decrypt({ ciphertext: ciphertext }, token, {
    iv: iv
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

export class CredentialsWidget extends Widget {
  private div: HTMLElement;
  private setAddCredentialListener: (listener: () => void) => void;

  private getCredentialList: () => Array<ICredential>;
  private setCredentialsList: (credentials: Array<ICredential>) => void;
  private setLastId: (lastId: number) => void;
  private getLastId: () => number;
  private onSaved: () => void;
  private onStop: () => void;

  private token: string;
  private unencrypted_token: string;

  private serviceManager: ServiceManager.IManager;
  private _sessionContext: SessionContext;
  private _model: KernelModel;

  private _loading = true;

  constructor(options: CredentialsWidget.IOptions) {
    super();
    this.addClass('jp-CredentialsStore');
    this.div = document.createElement('div');
    this.div.id = 'rootContent';
    this.div.setAttribute('tabindex', '1');
    this.node.appendChild(this.div);

    this.serviceManager = options.serviceManager;

    this.setAddCredentialListener = options.setAddCredentialListener;
    this.setCredentialListGetter = this.setCredentialListGetter.bind(this);
    this.setSetCredentialsListener = this.setSetCredentialsListener.bind(this);
    this.setLastIdGetter = this.setLastIdGetter.bind(this);
    this.setSetLastIdListener = this.setSetLastIdListener.bind(this);
    this.setOnSavedListener = this.setOnSavedListener.bind(this);
    this.setOnStopListener = this.setOnStopListener.bind(this);
    this.onTokenSet = this.onTokenSet.bind(this);

    this.token = '';
    // '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b'; // TODO

    this.login = this.login.bind(this);
    options.setLoginListener(this.login);

    this.load = this.load.bind(this);
    this.setToken = this.setToken.bind(this);

    this.stop = this.stop.bind(this);
    options.setStopListener(this.stop);

    this.save = this.save.bind(this);
    options.setSaveListener(this.save);

    this.removeCredential = this.removeCredential.bind(this);
    // this.initCode();
  }

  initCode() {
    const code = `import os, sys
from pathlib import Path
from sys import path
import base64

os.chdir(str(Path.home()))
curwd = os.path.join(os.getcwd(), '.credentialstore')

escaped_curwd = curwd.replace('\\\\', '\\\\\\\\')

PATH = os.path.join(str(Path.home()), '.jupyter-credentialstore')
os.makedirs(PATH, exist_ok=True)

to_add=Path(PATH)

if str(to_add) not in path:
    minLen=999999
    for index,directory in enumerate(path):
        if 'site-packages' in directory and len(directory)<=minLen:
            minLen=len(directory)
            stpi=index

    pathSitePckgs=Path(path[stpi])
    with open(str(pathSitePckgs/'current_machine_paths.pth'),'w') as pth_file:
        pth_file.write(str(to_add))

with open(PATH+"/secrets.py", 'w') as f:
    f.write("""
import json, os
import jupyter_client
import pickle
import base64
from Cryptodome.Cipher import AES

PATH = '"""+escaped_curwd+"""'

BLOCK_SIZE = 16
def unpad(data):
    return data[:-data[-1]]

def decrypt(value):

    value = base64.b64decode(value)
    IV = value[:BLOCK_SIZE]
    aes = AES.new(b'4ea5c508a6566e76', AES.MODE_CBC, IV)
    return unpad(aes.decrypt(value[BLOCK_SIZE:])).decode('UTF-8')

def get_json_data():
    # get the kernel data
    with open(PATH, 'r') as f:
        data = f.read()
        json_data = json.loads(data)
        return json_data

def get_secret(target_tag):
    # Retrieve the data from the credential store
    kernel_data = get_json_data()
    
    credentials = kernel_data.get('credentials', [])
    
    for credential in credentials:
        if credential.get('tag') == target_tag:
            return decrypt(credential.get('value'))
    
    return None

""")
`;
    this.executeCode({ code, stop_on_error: true });
  }

  async executeCode(content: KernelMessage.IExecuteRequestMsg['content']) {
    this._sessionContext = new SessionContext({
      sessionManager: this.serviceManager.sessions,
      specsManager: this.serviceManager.kernelspecs,
      name: 'jupyterlab-store'
    });
    await this._sessionContext.initialize();
    return this._sessionContext.changeKernel({ name: 'python3' }).then(
      res => {
        console.log('[KERNEL] change Kernel success');
        this._model = new KernelModel(this._sessionContext);
        return this._model.requestExecute(content);
      },
      err => {
        console.error('[KERNEL] ', err);
      }
    );
  }

  setCredentialListGetter(getCredentialList: () => Array<ICredential>) {
    this.getCredentialList = getCredentialList;
  }

  setSetCredentialsListener(
    setCredentialsList: (credentials: Array<ICredential>) => void
  ) {
    this.setCredentialsList = setCredentialsList;
  }

  setLastIdGetter(getLastId: () => number) {
    this.getLastId = getLastId;
  }

  setSetLastIdListener(setLastId: (lastId: number) => void) {
    this.setLastId = setLastId;
  }

  setOnSavedListener(onSaved: () => void) {
    this.onSaved = onSaved;
  }

  setOnStopListener(onStop: () => void) {
    this.onStop = onStop;
  }

  onTokenSet(token: string) {
    this.unencrypted_token = token;
    this.load(token);
    this.render(() => {
      // document.getElementById('overlay').style.display = 'none';
      this._loading = false;
    });
  }

  setToken(token: string) {
    this.token = token;
    this.render(() => {
      // document.getElementById('overlay').style.display = 'none';
      this._loading = false;
    });
  }

  login() {
    // document.getElementById('overlay').style.display = 'block';
    this.stop();
    this.load(this.unencrypted_token);
  }

  load(token: string) {
    this.pyWriteFile(
      this._sessionContext,
      token,
      this.getLastId(),
      undefined,
      (lastId, credentials) => {
        this.setCredentialsList(credentials);
        this.setLastId(lastId);
      },
      this.setToken
    );
  }

  stop() {
    this.unencrypted_token = '';
    this.token = '';

    this.onStop();
    this._sessionContext.session?.shutdown();
  }

  save() {
    this.pyWriteFile(
      this._sessionContext,
      this.unencrypted_token,
      this.getLastId(),
      this.getCredentialList(),
      undefined,
      this.setToken
    );

    this.onSaved();
  }

  removeCredential(tag: string) {
    setTimeout(() => {
      this.save();
    }, 500);
    console.log('remove: ' + tag);
  }

  pyWriteFile = (
    _sessionContext,
    token,
    lastId,
    credentials,
    onStoredCredentials,
    setToken
  ) => {
    const enc_credentials =
      credentials !== undefined
        ? credentials.map(c => {
            const val = encrypt(c.value, token);
            return { id: c.id, tag: c.tag, value: val, changed: c.changed };
          })
        : credentials;

    const kernel_id = '';

    const code =
      `
import pickle, os, json
from pathlib import Path
import base64, os
from Cryptodome.Cipher import AES

home = str(Path.home())
PATH = str(Path.home())+'/.credentialstore'

BLOCK_SIZE = 16
def unpad(data):
    return data[:-data[-1]]

def decrypt(value):
` +
      (token !== undefined
        ? `
    value = base64.b64decode(value)
    IV = value[:BLOCK_SIZE]
    aes = AES.new(b'` +
          token.substring(0, 16) +
          `', AES.MODE_CBC, IV)
    return unpad(aes.decrypt(value[BLOCK_SIZE:]))
`
        : `
    return value
`) +
      `
# prepare loading the existing data
json_data_to_write = {"credentials": [], "lastId": 0}
json_data = {"credentials": [], "lastId": 0}

if os.path.isfile(PATH):
    with open(PATH, 'r') as f:
        data = f.read()
        json_data = json.loads(data)
` +
      (enc_credentials === undefined
        ? `
json_data_to_write = json_data
for credential in json_data["credentials"]:
    if credential["tag"] is not None and len(credential["tag"]) > 0:` +
          (token !== undefined
            ? `
        pass
`
            : `
        pass
`) +
          `
        
`
        : enc_credentials
            .map(credential => {
              return (
                'json_data_to_write["credentials"].append({"id":"' +
                credential.id +
                '","tag":"' +
                (credential.tag !== undefined ? credential.tag : '') +
                '","value":"' +
                (credential.value !== undefined ? credential.value : '') +
                '","changed":False})\n'
              );
            })
            .reduce((res, val) => res + '\n' + val, '')) +
      `
json_data_to_write["kernel_id"] = "` +
      kernel_id +
      `"
json_data_to_write["lastId"] = max(int(json_data["lastId"]), int(` +
      lastId +
      `))
if "token" not in json_data_to_write.keys():
    ` +
      (token !== undefined
        ? 'json_data_to_write["token"]="' +
          CryptoJS.SHA256(token).toString() +
          '"'
        : 'pass') +
      `
with open(PATH, 'w') as f:
    json.dump(json_data_to_write, f);
`;

    const userExpressions = { output: 'json.dumps(json_data)' };

    const content: KernelMessage.IExecuteRequestMsg['content'] = {
      code: code,
      stop_on_error: true,
      user_expressions: userExpressions
    };

    this.executeCode(content).then((msg: KernelMessage.IExecuteReplyMsg) => {
      if (msg.content.status === 'error') {
        console.log(msg.content.traceback.join('\n'));
        return;
      }

      const raw_data =
        msg['content']['user_expressions']['output']['data']['text/plain'];

      const data = JSON.parse(raw_data.replace(/^'+|'+$/g, ''));

      setToken(data.token);

      if (onStoredCredentials !== undefined && token !== undefined) {
        const dec_credentials = data.credentials.map(c => {
          const val = decrypt(c.value, token);
          return {
            id: c.id,
            tag: c.tag,
            value: val,
            changed: c.changed
          };
        });

        onStoredCredentials(data.lastId, dec_credentials);
      }
    });
  };

  protected onAfterShow(msg: Message): void {
    new Promise<void>((resolve, reject) => {
      this.render(() => {
        resolve();
      });
    });
  }

  render(onRendered: () => any) {
    ReactDOM.render(
      <Provider store={store}>
        <div>
          {this._loading && (
            <div id="overlay">
              <div className="loader"></div>
            </div>
          )}
          <CredentialsList
            className="jp-CredentialsStore"
            argtoken={this.token}
            isConnected={true}
            setAddCredentialListener={this.setAddCredentialListener}
            setCredentialListGetter={this.setCredentialListGetter}
            setSetCredentialsListener={this.setSetCredentialsListener}
            setSetLastIdListener={this.setSetLastIdListener}
            setLastIdGetter={this.setLastIdGetter}
            setOnSavedListener={this.setOnSavedListener}
            onTokenSet={this.onTokenSet}
            setOnStopListener={this.setOnStopListener}
            onRemoveCredential={this.removeCredential}
          />
        </div>
      </Provider>,
      document.getElementById('rootContent'),
      onRendered
    );
  }
}

// The namespace for the `CredentialsWidget` class statics.
export namespace CredentialsWidget {
  export interface IOptions {
    // provides access to service, like sessions
    serviceManager: ServiceManager.IManager;
    // function called when the user saves the credentials
    setSaveListener: (listener: () => void) => void;

    //function called when the user adds a credential
    setAddCredentialListener: (listener: () => void) => void;

    //function called when the user clicks the login button
    setLoginListener: (listener: () => void) => void;

    //function called when the user clicks the stop button
    setStopListener: (listener: () => void) => void;
  }
}
