import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View,Text } from 'react-native';

import { useTheme } from '@theme';

import { createStyles } from '../styles/index.styles';
import { SelectSummaryProp } from '../types/index.type';


const SelectSummary:React.FC<SelectSummaryProp> = ({
    city,
    country,
    latitude,
    longitude,
}) => {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.selectedSummary}>
                  <Ionicons
                    name="pin"
                    size={14}
                    color={theme.palette.azure}
                    style={styles.selectedIcon}
                  />
                  <Text style={styles.selectedSummaryText}>
                    {t('astro.birthData.form.selectedOnMap')}{' '}
                    {city && country
                      ? t('astro.birthData.form.nearLocation', { city, country })
                      : `${latitude?.toFixed(4)}, ${longitude?.toFixed(4)}`}
                  </Text>
                </View>
  );
};

export default SelectSummary;
