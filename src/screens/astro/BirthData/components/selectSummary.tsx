import React, { useMemo } from 'react';
import { View,Text ,} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { SelectSummaryProp } from '../types/index.type';
import { createStyles } from '../styles/index.styles';


const SelectSummary:React.FC<SelectSummaryProp> = ({
    city,
    country,
    latitude,
    longitude,
}) => {
    const { theme } = useTheme();
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
                    Selected on map:{' '}
                    {city && country
                      ? `near ${city}, ${country}`
                      : `${latitude?.toFixed(4)}, ${longitude?.toFixed(4)}`}
                  </Text>
                </View>
  );
};

export default SelectSummary;