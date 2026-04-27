import type { GlobalThemeOverrides } from 'naive-ui'

export const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#236b64',
    primaryColorHover: '#2d8a82',
    primaryColorPressed: '#1a524c',
    primaryColorSuppl: '#325f88',
    infoColor: '#325f88',
    infoColorHover: '#40749e',
    infoColorPressed: '#264a6a',
    successColor: '#3c8e5d',
    successColorHover: '#4ba670',
    successColorPressed: '#2d7048',
    warningColor: '#bd8d3c',
    warningColorHover: '#c99a4d',
    warningColorPressed: '#a0782f',
    errorColor: '#a64846',
    errorColorHover: '#b85553',
    errorColorPressed: '#8a3836',
    textColor1: '#17211f',
    textColor2: 'rgba(23, 33, 31, 0.7)',
    textColor3: 'rgba(23, 33, 31, 0.48)',
    borderColor: 'rgba(31, 56, 52, 0.14)',
    dividerColor: 'rgba(31, 56, 52, 0.1)',
    borderRadius: '6px',
    borderRadiusSmall: '6px',
    fontFamily:
      '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    fontSize: '15px',
    fontSizeMedium: '15px',
    fontSizeLarge: '16px',
    fontWeightStrong: '600',
    inputColor: 'rgba(255, 255, 253, 0.84)',
    modalColor: 'rgba(255, 255, 253, 0.92)',
    cardColor: 'rgba(255, 255, 253, 0.86)',
    popoverColor: 'rgba(255, 255, 253, 0.94)',
    bodyColor: 'transparent',
    actionColor: 'rgba(255, 255, 253, 0.78)',
    hoverColor: 'rgba(35, 107, 100, 0.08)',
    placeholderColor: 'rgba(23, 33, 31, 0.4)',
    placeholderColorDisabled: 'rgba(23, 33, 31, 0.25)',
    closeColorHover: 'rgba(23, 33, 31, 0.6)',
    closeColorPressed: 'rgba(23, 33, 31, 0.8)',
    closeIconColor: 'rgba(23, 33, 31, 0.5)',
  },

  Button: {
    borderRadiusMedium: '6px',
    borderRadiusLarge: '8px',
    heightMedium: '40px',
    heightLarge: '48px',
    paddingMedium: '0 14px',
    paddingLarge: '0 20px',
    fontSizeMedium: '0.92rem',
    fontSizeLarge: '1rem',
    textColor: '#17211f',
    textColorHover: '#17211f',
    textColorPressed: '#17211f',
    textColorFocus: '#17211f',
    colorHover: 'rgba(255, 255, 253, 0.82)',
    colorPressed: 'rgba(235, 242, 237, 0.9)',
    colorFocus: 'rgba(255, 255, 253, 0.82)',
    border: '1px solid rgba(31, 56, 52, 0.14)',
    borderHover: '1px solid rgba(31, 56, 52, 0.22)',
    borderPressed: '1px solid rgba(35, 107, 100, 0.24)',
    borderFocus: '1px solid rgba(31, 56, 52, 0.22)',
    ghostColor: '#17211f',
    ghostColorHover: '#17211f',
    ghostColorPressed: '#17211f',
    ghostBorder: '1px solid rgba(31, 56, 52, 0.14)',
    ghostBorderHover: '1px solid rgba(31, 56, 52, 0.22)',
    ghostBorderPressed: '1px solid rgba(31, 56, 52, 0.22)',
  },

  Input: {
    borderRadius: '6px',
    heightMedium: '48px',
    fontSizeMedium: '0.95rem',
    paddingMedium: '0 16px',
    color: 'rgba(255, 255, 253, 0.82)',
    colorFocus: 'rgba(255, 255, 253, 0.94)',
    border: '1px solid rgba(31, 56, 52, 0.14)',
    borderHover: '1px solid rgba(35, 107, 100, 0.22)',
    borderFocus: '1px solid rgba(35, 107, 100, 0.32)',
    boxShadowFocus: '0 0 0 2px rgba(35, 107, 100, 0.1)',
  },

  Select: {
    peers: {
      InternalSelection: {
        borderRadius: '6px',
        heightMedium: '48px',
        fontSizeMedium: '0.95rem',
        color: 'rgba(255, 255, 253, 0.82)',
        border: '1px solid rgba(31, 56, 52, 0.14)',
      },
    },
  },

  Slider: {
    fillColor: '#236b64',
    fillColorHover: '#2d8a82',
  },

  Checkbox: {
    borderRadius: '4px',
    colorChecked: '#236b64',
    borderChecked: '#236b64',
  },

  Switch: {
    railColorActive: '#236b64',
  },

  Tag: {
    borderRadius: '6px',
    colorBordered: 'rgba(255, 255, 253, 0.72)',
    borderBordered: '1px solid rgba(31, 56, 52, 0.14)',
    textColorBordered: 'rgba(23, 33, 31, 0.7)',
    heightMedium: '32px',
  },

  Progress: {
    fillColor: 'rgba(35, 107, 100, 0.92)',
    railColor: 'rgba(35, 107, 100, 0.12)',
    height: '8px',
    borderRadius: '8px',
    railBorderRadius: '8px',
  },

  Drawer: {
    bodyPadding: '28px',
    borderRadius: '8px',
  },

  Card: {
    borderRadius: '8px',
    borderColor: 'rgba(31, 56, 52, 0.14)',
    color: 'rgba(251, 253, 251, 0.94)',
    boxShadow: '0 14px 34px rgba(20, 43, 41, 0.1)',
    paddingMedium: '20px',
  },

  Dialog: {
    borderRadius: '8px',
  },

  Tabs: {
    tabTextColorActiveLine: '#236b64',
    tabTextColorHoverLine: '#2d8a82',
    barColor: '#236b64',
  },

  Notification: {
    borderRadius: '8px',
    color: 'rgba(255, 251, 246, 0.94)',
    borderColor: 'rgba(57, 42, 28, 0.12)',
    boxShadow: '0 18px 45px rgba(42, 32, 18, 0.14)',
    textColor: '#17211f',
    headerFontWeight: '600',
  },
}
