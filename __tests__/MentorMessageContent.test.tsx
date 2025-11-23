import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { MentorMessageContent } from '@components/chat/MentorMessageContent';

describe('MentorMessageContent', () => {
  it('renders paragraph splits', () => {
    const { getByText } = render(
      <MentorMessageContent text={'First paragraph.\n\nSecond paragraph.'} />,
    );

    expect(getByText('First paragraph.')).toBeTruthy();
    expect(getByText('Second paragraph.')).toBeTruthy();
  });

  it('renders bullet lists', () => {
    const { getAllByText, getByText } = render(
      <MentorMessageContent text={'- Point one\n- Point two'} />,
    );

    expect(getAllByText('•').length).toBeGreaterThanOrEqual(2);
    expect(getByText('Point one')).toBeTruthy();
    expect(getByText('Point two')).toBeTruthy();
  });

  it('renders bold and italic markers', () => {
    const { getByText } = render(
      <MentorMessageContent text={'This is **bold** and also _soft_.'} />,
    );

    expect(getByText('bold')).toHaveStyle({ fontWeight: '700' });
    expect(getByText('soft')).toHaveStyle({ fontStyle: 'italic' });
  });

  it('collapses long content', () => {
    const longText = Array.from({ length: 12 })
      .map((_, idx) => `Line ${idx + 1}`)
      .join('\n');
    const { getByText, queryByText } = render(
      <MentorMessageContent text={longText} collapsibleLines={8} />,
    );

    expect(queryByText('Line 12')).toBeNull();
    const toggle = getByText('Show more');
    fireEvent.press(toggle);
    expect(getByText('Show less')).toBeTruthy();
  });
});
