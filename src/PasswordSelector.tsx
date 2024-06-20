declare let require: any;
const CryptoJS = require('crypto-js');

import React, { useEffect } from 'react';
import * as Redux from 'redux';
import { connect } from 'react-redux';

import '../style/index.css';

import {
  setTokenA,
  setTokenB,
  getTokenA,
  getTokenB,
  getActiveToken,
  setActiveToken
} from './ducks/token';

interface IStateProps {
  tokenA: string;
  tokenB: string;
  activeToken?: string;
}

interface IDispatchProps {
  setTokenA: (token: string) => void;
  setTokenB: (token: string) => void;
  setActiveToken: (token: string) => void;
}

interface IArgProps {
  onTokenSet: (token: string) => void;
  argToken: string;
}

type Props = IStateProps & IDispatchProps & IArgProps;

const PasswordSelector: React.FC<Props> = props => {
  const mockToken = CryptoJS.SHA256(1).toString();

  useEffect(() => {
    props.setTokenA(mockToken);
    props.setTokenB(mockToken);
    props.setActiveToken(mockToken);
    props.onTokenSet(mockToken);
  }, []);

  return <div>Loading </div>;
};

function mapStateToProps(state: any, props: Props): IStateProps {
  return {
    tokenA: getTokenA(state),
    tokenB: getTokenB(state),
    activeToken: getActiveToken(state)
  };
}

function mapDispatchToProps(
  dispatch: Redux.Dispatch<any>,
  props: Props
): IDispatchProps {
  return {
    setTokenA: (token: string) => {
      dispatch(setTokenA(token));
    },
    setTokenB: (token: string) => {
      dispatch(setTokenB(token));
    },
    setActiveToken: (token: string) => {
      dispatch(setActiveToken(token));
    }
  };
}

export default connect<IStateProps, IDispatchProps, IArgProps>(
  mapStateToProps,
  mapDispatchToProps
)(PasswordSelector);
