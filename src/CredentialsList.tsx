// https://reactjs.org/docs/react-without-es6.html
// https://levelup.gitconnected.com/ultimate-react-component-patterns-with-typescript-2-8-82990c516935

declare let require: any;
const CryptoJS = require('crypto-js');

import React, { useCallback, useState } from 'react';
import { connect } from 'react-redux';

import '../style/index.css';

import PasswordSelector from './PasswordSelector';

import {
  ICredential,
  getCredentials,
  addCredential,
  removeCredential,
  setCredential,
  getLastId,
  setLastId
} from './ducks/credentials';

import { getActiveToken, setActiveToken } from './ducks/token';

interface IStateProps {
  credentials: Array<ICredential>;
  lastId: number;
  token?: string;
}

interface IDispatchProps {
  addCredential: () => void;
  removeCredential: (id: string) => void;
  setCredential: (
    id: string,
    tag: string,
    value: string,
    changed: boolean
  ) => void;
  setLastId: (lastid: number) => void;
  setActiveToken: (token: string) => void;
}

interface IArgProps {
  isConnected: boolean;
  argtoken: string;
  setAddCredentialListener: (listener: () => void) => void;
  setSetCredentialsListener: (
    listener: (credentials: Array<ICredential>) => void
  ) => void;
  setCredentialListGetter: (
    getCredentialList: () => Array<ICredential>
  ) => void;
  setSetLastIdListener: (listener: (lastId: number) => void) => void;
  setLastIdGetter: (getLastId: () => number) => void;
  setOnSavedListener: (onSaved: () => void) => void;
  onTokenSet: (token: string) => void;
  setOnStopListener: (listener: () => void) => void;
  onRemoveCredential: (tag: string) => void;
  className: string;
}

type Props = IStateProps & IDispatchProps & IArgProps;

const CredentialsList: React.FC<Props> = props => {
  props.setAddCredentialListener(props.addCredential);
  props.setCredentialListGetter(() => props.credentials);
  props.setSetCredentialsListener((credentials: Array<ICredential>) => {
    for (const key in Object.keys(credentials)) {
      props.setCredential(
        credentials[key].id,
        credentials[key].tag,
        credentials[key].value,
        false
      );
    }
  });

  props.setSetLastIdListener((lastId: number) => {
    if (lastId !== undefined) {
      props.setLastId(lastId);
    }
  });
  props.setLastIdGetter(() => props.lastId);

  props.setOnSavedListener(() => {
    for (const key in Object.keys(props.credentials)) {
      const credential = props.credentials[key];
      props.setCredential(
        credential.id,
        credential.tag,
        credential.value,
        false
      );
    }
  });

  props.setOnStopListener(() => {
    props.setActiveToken('');
  });

  const [errMsg, setErrMsg] = useState('');

  const valid = useCallback((event, credential) => {
    const tag = event.target.value;
    if (/^[a-zA-Z0-9_]+$/.test(tag)) {
      props.setCredential(
        credential.id,
        event.target.value,
        credential.value,
        true
      );
      setErrMsg('');
    } else {
      setErrMsg(tag.replace(/[a-zA-Z0-9_]/g, ''));
    }
  }, []);

  return props.isConnected ? (
    props.argtoken !== undefined && props.argtoken === props.token ? (
      <div>
        <table className="jp-CredentialsTable">
          <tbody>
            <tr>
              <th></th>
              <th>Key</th>
              <th>Value</th>
              <th className="jp-Column"></th>
            </tr>
            {props.credentials.map(credential => (
              <tr>
                <td className="jp-StarColumn">
                  {credential.changed ? '*' : ''}
                </td>
                <td className="jp-Cell">
                  <input
                    className={'jp-Input'}
                    type="text"
                    value={credential.tag !== undefined ? credential.tag : ''}
                    onChange={event => valid(event, credential)}
                  />
                </td>
                <td className="jp-Cell">
                  <input
                    className="jp-Input"
                    type="password"
                    value={
                      credential.value !== undefined ? credential.value : ''
                    }
                    onChange={event =>
                      props.setCredential(
                        credential.id,
                        credential.tag,
                        event.target.value,
                        true
                      )
                    }
                  />
                </td>
                <td className="jp-Column">
                  <button
                    className="jp-Button"
                    onClick={() => {
                      props.removeCredential(credential.id);
                      props.onRemoveCredential(credential.tag);
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {errMsg.length > 0 && (
          <div className="jp-CredentialMsg">
            Hint: Only letters, numbers and underscores can be used in key.
            <br />
            Error input: {errMsg}
          </div>
        )}
      </div>
    ) : (
      <PasswordSelector
        argToken={props.argtoken}
        onTokenSet={props.onTokenSet}
      />
    )
  ) : (
    <div className="jp-Frame">
      <h2>Credential Store</h2>
      <p>
        You need to log in to set and access your credentials. Please click on
        the key above...
      </p>
    </div>
  );
};

function mapStateToProps(state: any, props: Props): IStateProps {
  return {
    credentials: getCredentials(state),
    lastId: getLastId(state),
    token: CryptoJS.SHA256(getActiveToken(state)).toString()
  };
}

function mapDispatchToProps(dispatch: any): IDispatchProps {
  return {
    addCredential: () => {
      dispatch(addCredential());
    },
    removeCredential: (id: string) => {
      dispatch(removeCredential(id));
    },
    setCredential: (
      id: string,
      tag: string,
      value: string,
      changed: boolean
    ) => {
      dispatch(setCredential(id, tag, value, changed));
    },
    setLastId: (lastid: number) => {
      dispatch(setLastId(lastid));
    },
    setActiveToken: (token: string) => {
      dispatch(setActiveToken(token));
    }
  };
}

export default connect<IStateProps, IDispatchProps, IArgProps>(
  mapStateToProps,
  mapDispatchToProps
)(CredentialsList);
