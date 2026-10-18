import type {Href,ImperativeRouter} from 'expo-router';

// Direct links have no previous app screen. Replace with an allowed parent
// instead of leaving the user on a Back button that cannot do anything.
export function navigateBack(router:Pick<ImperativeRouter,'canGoBack'|'back'|'replace'>,fallback:Href='/'){
 if(router.canGoBack())router.back();
 else router.replace(fallback);
}
