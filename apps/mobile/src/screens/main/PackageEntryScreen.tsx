import React from 'react';
import { Button } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import { ScreenPlaceholder } from '../../components/ScreenPlaceholder';
import type { HomeStackParamList } from '../../navigation/AppTabs';

type Props = StackScreenProps<HomeStackParamList, 'PackageEntry'>;

export function PackageEntryScreen({ navigation, route }: Props): React.JSX.Element {
  return (
    <ScreenPlaceholder title="Add packages" subtitle="Enter package refs and addresses.">
      <Button
        title="Preview route"
        onPress={() => navigation.navigate('RoutePreview', { sessionId: route.params.sessionId })}
      />
    </ScreenPlaceholder>
  );
}
