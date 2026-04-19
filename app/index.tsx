import { Redirect } from 'expo-router';

/** `/` resolves to the main hub (renewals + summary pager). */
export default function RootIndex() {
  return <Redirect href="/(tabs)/hub" />;
}
