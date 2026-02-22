import { useCallback, useMemo } from 'react';
import { Linking, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';

import { useTheme } from '../../theme';
import { palette } from '../../theme/colors';

type Props = {
  children: string;
};

export function MarkdownText({ children }: Props) {
  const { theme } = useTheme();
  const handleLinkPress = useCallback((url: string) => {
    if (!url) {
      return false;
    }
    Linking.openURL(url).catch((error) => {
      console.warn('MarkdownText: failed to open link', error);
    });
    return true;
  }, []);

  const markdownStyles = useMemo(
    () =>
      StyleSheet.create({
        body: {
          ...theme.typography.body,
          color: theme.text.primary,
          fontSize: 15,
          lineHeight: 22,
        },
        paragraph: {
          marginBottom: 10,
        },
        text: {
          color: theme.text.primary,
        },
        heading1: {
          ...theme.typography.title,
          color: theme.text.primary,
          marginTop: 12,
          marginBottom: 8,
        },
        heading2: {
          ...theme.typography.subtitle,
          color: theme.text.primary,
          marginTop: 10,
          marginBottom: 6,
        },
        heading3: {
          ...theme.typography.subtitle,
          fontSize: 18,
          color: theme.text.primary,
          marginTop: 8,
          marginBottom: 6,
        },
        heading4: {
          ...theme.typography.subtitle,
          fontSize: 16,
          color: theme.text.primary,
          marginTop: 6,
          marginBottom: 4,
        },
        heading5: {
          ...theme.typography.subtitle,
          fontSize: 15,
          color: theme.text.primary,
          marginTop: 4,
          marginBottom: 4,
        },
        heading6: {
          ...theme.typography.subtitle,
          fontSize: 14,
          color: theme.text.secondary,
          marginTop: 4,
          marginBottom: 4,
        },
        strong: {
          fontWeight: '700',
          color: theme.text.primary,
        },
        em: {
          fontStyle: 'italic',
          color: theme.text.primary,
        },
        link: {
          color: theme.colors.primary,
          fontWeight: '600',
        },
        hr: {
          borderBottomColor: 'rgba(148,163,184,0.35)',
          borderBottomWidth: StyleSheet.hairlineWidth,
          marginVertical: 12,
        },
        blockquote: {
          borderLeftColor: palette.azure,
          borderLeftWidth: 3,
          paddingLeft: 12,
          color: theme.text.secondary,
          backgroundColor: 'rgba(14,165,233,0.05)',
          borderRadius: 12,
          marginVertical: 10,
        },
        bullet_list_icon: {
          color: palette.glow,
        },
        bullet_list: {
          paddingLeft: 6,
        },
        ordered_list: {
          paddingLeft: 6,
        },
        list_item: {
          marginBottom: 4,
        },
        list_item_text: {
          color: theme.text.primary,
        },
        code_inline: {
          backgroundColor: '#111827',
          color: '#F8FAFC',
          borderRadius: 6,
          paddingHorizontal: 6,
          paddingVertical: 2,
          fontFamily: 'Courier',
        },
        code_block: {
          backgroundColor: '#0F172A',
          color: '#F8FAFC',
          borderRadius: 12,
          padding: 14,
          fontFamily: 'Courier',
          borderWidth: 1,
          borderColor: 'rgba(15,23,42,0.6)',
          marginBottom: 12,
        },
        fence: {
          backgroundColor: '#0F172A',
          color: '#F8FAFC',
          borderRadius: 12,
          padding: 14,
          fontFamily: 'Courier',
          borderWidth: 1,
          borderColor: 'rgba(15,23,42,0.6)',
          marginBottom: 12,
        },
        table: {
          borderWidth: 1,
          borderColor: 'rgba(148,163,184,0.3)',
          borderRadius: 12,
          marginBottom: 12,
        },
        thead: {
          backgroundColor: 'rgba(148,163,184,0.1)',
        },
        th: {
          ...theme.typography.subtitle,
          color: theme.text.primary,
          padding: 8,
        },
        tr: {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: 'rgba(148,163,184,0.2)',
        },
        td: {
          color: theme.text.primary,
          padding: 8,
        },
        strikethrough: {
          textDecorationLine: 'line-through',
          color: theme.text.secondary,
        },
      }),
    [theme],
  );

  return (
    <Markdown style={markdownStyles} onLinkPress={handleLinkPress}>
      {children || ''}
    </Markdown>
  );
}
