import React from 'react';
import { Button } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import { ScreenPlaceholder } from '../../components/ScreenPlaceholder';
import type { HomeStackParamList } from '../../navigation/AppTabs';

type Props = StackScreenProps<HomeStackParamList, 'PackageEntry'>;

export function PackageEntryScreen({ navigation, route }: Props): React.JSX.Element {
  const { sessionId } = route.params;
  return (
    <ScreenPlaceholder title="PackageEntry" subtitle="Add the packages for today's run.">
      <Button
        title="Preview route"
        onPress={() => navigation.navigate('RoutePreview', { sessionId })}
      />
    </ScreenPlaceholder>
  );
}
