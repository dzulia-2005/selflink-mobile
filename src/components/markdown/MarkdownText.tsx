import { useCallback } from 'react';
import { Linking, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';

import { palette } from '../../theme/colors';
import { typography } from '../../theme/typography';

type Props = {
  children: string;
};

export function MarkdownText({ children }: Props) {
  const handleLinkPress = useCallback((url: string) => {
    if (!url) {
      return false;
    }
    Linking.openURL(url).catch((error) => {
      console.warn('MarkdownText: failed to open link', error);
    });
    return true;
  }, []);

  return (
    <Markdown style={markdownStyles} onLinkPress={handleLinkPress}>
      {children || ''}
    </Markdown>
  );
}

const markdownStyles = StyleSheet.create({
  body: {
    ...typography.body,
    color: palette.pearl,
  },
  paragraph: {
    ...typography.body,
    color: palette.pearl,
    marginBottom: 2,
  },
  text: {
    color: palette.pearl,
  },
  heading1: {
    ...typography.title,
    color: palette.pearl,
    marginTop: 12,
  },
  heading2: {
    ...typography.subtitle,
    color: palette.pearl,
    marginTop: 10,
  },
  heading3: {
    ...typography.subtitle,
    fontSize: 16,
    color: palette.pearl,
    marginTop: 8,
  },
  heading4: {
    ...typography.subtitle,
    fontSize: 15,
    color: palette.pearl,
  },
  strong: {
    fontWeight: '700',
    color: palette.pearl,
  },
  em: {
    fontStyle: 'italic',
    color: palette.pearl,
  },
  link: {
    color: palette.glow,
  },
  blockquote: {
    borderLeftColor: palette.azure,
    borderLeftWidth: 3,
    paddingLeft: 12,
    color: palette.platinum,
  },
  bullet_list: {
    color: palette.pearl,
  },
  ordered_list: {
    color: palette.pearl,
  },
  list_item: {
    color: palette.pearl,
  },
  list_item_text: {
    color: palette.pearl,
  },
  code_inline: {
    backgroundColor: palette.titanium,
    color: palette.pearl,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    fontFamily: 'Courier',
  },
  code_block: {
    backgroundColor: '#111827',
    color: palette.pearl,
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Courier',
  },
  fence: {
    backgroundColor: '#111827',
    color: palette.pearl,
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Courier',
  },
});
