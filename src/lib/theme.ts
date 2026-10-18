import type { ThemeConfig } from 'antd'

export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#0d9488',
    colorInfo: '#0d9488',
    colorSuccess: '#16a34a',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    colorTextBase: '#0f172a',
    colorBgLayout: '#f4f7f9',
    colorBorderSecondary: '#e8edf2',
    borderRadius: 10,
    borderRadiusLG: 16,
    fontSize: 14,
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
    boxShadowSecondary: '0 12px 32px rgba(15, 23, 42, 0.12)',
  },
  components: {
    Button: { controlHeight: 38, fontWeight: 500, primaryShadow: '0 4px 12px rgba(13, 148, 136, 0.25)' },
    Input: { controlHeight: 38 },
    InputNumber: { controlHeight: 38 },
    Select: { controlHeight: 38 },
    Table: {
      headerBg: '#f8fafc',
      headerColor: '#475569',
      headerSplitColor: 'transparent',
      rowHoverBg: '#f0fdfa',
      borderColor: '#eef2f6',
    },
  },
}