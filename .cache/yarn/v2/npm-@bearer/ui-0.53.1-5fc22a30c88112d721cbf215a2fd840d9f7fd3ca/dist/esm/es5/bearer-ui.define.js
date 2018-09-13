// BearerUi: Custom Elements Define Library, ES Module/ES5 Target
import { defineCustomElement } from './bearer-ui.core.js';
import {
  Alert,
  AuthConfig,
  BearerAuthorized,
  BearerBadge,
  BearerButtonPopover,
  BearerCheckbox,
  BearerConfig,
  BearerConfigDisplay,
  BearerDropdownButton,
  BearerForm,
  BearerInput,
  BearerNavigatorAuthScreen,
  BearerNavigatorBack,
  BearerNavigatorCollection,
  BearerNavigatorScreen,
  BearerPagination,
  BearerPaginator,
  BearerPopoverNavigator,
  BearerRadio,
  BearerScrollable,
  BearerSelect,
  BearerSetup,
  BearerSetupDisplay,
  BearerTextarea,
  Button,
  Button,
  Typography
} from './bearer-ui.components.js';

export function defineCustomElements(window, opts) {
  defineCustomElement(window, [
    Alert,
    AuthConfig,
    BearerAuthorized,
    BearerBadge,
    BearerButtonPopover,
    BearerCheckbox,
    BearerConfig,
    BearerConfigDisplay,
    BearerDropdownButton,
    BearerForm,
    BearerInput,
    BearerNavigatorAuthScreen,
    BearerNavigatorBack,
    BearerNavigatorCollection,
    BearerNavigatorScreen,
    BearerPagination,
    BearerPaginator,
    BearerPopoverNavigator,
    BearerRadio,
    BearerScrollable,
    BearerSelect,
    BearerSetup,
    BearerSetupDisplay,
    BearerTextarea,
    Button,
    Button,
    Typography
  ], opts);
}