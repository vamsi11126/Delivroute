import React from 'react';
import type { StackScreenProps } from '@react-navigation/stack';
import { ScreenPlaceholder } from '../../components/ScreenPlaceholder';
import type { HomeStackParamList } from '../../navigation/AppTabs';

type Props = StackScreenProps<HomeStackParamList, 'RoutePreview'>;

export function RoutePreviewScreen(_props: Props): React.JSX.Element {
  return (
    <ScreenPlaceholder
      title="RoutePreview"
      subtitle="The optimised stop order will appear here."
    />
  );
}
