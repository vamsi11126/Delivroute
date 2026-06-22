import React from 'react';
import type { StackScreenProps } from '@react-navigation/stack';
import { ScreenPlaceholder } from '../../components/ScreenPlaceholder';
import type { HomeStackParamList } from '../../navigation/AppTabs';

type Props = StackScreenProps<HomeStackParamList, 'RoutePreview'>;

export function RoutePreviewScreen(_props: Props): React.JSX.Element {
  return (
    <ScreenPlaceholder
      title="Route preview"
      subtitle="Optimised stop order before you start delivering."
    />
  );
}
