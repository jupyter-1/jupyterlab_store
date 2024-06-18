import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the jupyterlab-store extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-store:plugin',
  description: 'A JupyterLab extension.',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyterlab-store is activated!');
  }
};

export default plugin;
