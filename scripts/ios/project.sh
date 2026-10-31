#!/usr/bin/env bash
# Source this file; selection returns PROJECT_ARGS without invoking Xcode.
select_ios_project() {
 local project_root="$1" candidate
 local workspaces=() projects=()
 if [[ -n "${COCREATE_IOS_PROJECT:-}" ]]; then
  if [[ ! -d "$COCREATE_IOS_PROJECT" ]]; then echo "Configured iOS project does not exist." >&2; return 1; fi
  case "$COCREATE_IOS_PROJECT" in
   *.xcworkspace) PROJECT_ARGS=(-workspace "$COCREATE_IOS_PROJECT"); return ;;
   *.xcodeproj) PROJECT_ARGS=(-project "$COCREATE_IOS_PROJECT"); return ;;
   *) echo "COCREATE_IOS_PROJECT must select an .xcodeproj or .xcworkspace." >&2; return 1 ;;
  esac
 fi
 while IFS= read -r -d '' candidate; do workspaces+=("$candidate"); done < <(
  find "$project_root" -type d \( -name '*.xcodeproj' -o -name Pods -o -name build \) -prune -o -type d -name '*.xcworkspace' -print0
 )
 if [[ ${#workspaces[@]} -gt 1 ]]; then echo "Multiple iOS workspaces; set COCREATE_IOS_PROJECT." >&2; return 1; fi
 if [[ ${#workspaces[@]} -eq 1 ]]; then PROJECT_ARGS=(-workspace "${workspaces[0]}"); return; fi
 while IFS= read -r -d '' candidate; do projects+=("$candidate"); done < <(
  find "$project_root" -type d \( -name Pods -o -name build \) -prune -o -type d -name '*.xcodeproj' -print0 -prune
 )
 if [[ ${#projects[@]} -ne 1 ]]; then echo "Expected one iOS host project; set COCREATE_IOS_PROJECT if multiple exist." >&2; return 1; fi
 PROJECT_ARGS=(-project "${projects[0]}")
}
