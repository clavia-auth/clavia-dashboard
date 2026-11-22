#!/usr/bin/env bash
# The Clavia project board (https://github.com/orgs/clavia-auth/projects/1) from the shell,
# for the ticket-* skills.
#
#   board.sh show                       open items: Status, Priority, Size, repository#number, title
#   board.sh status <url> <Status>      Backlog | Ready | In progress | In review | Done
#   board.sh set <url> <Field> <Value>  Priority P0–P3, Size XS–XL, Area …
#
# <url> is an issue's or a pull request's html_url; an item not on the board yet is added.
# Needs a gh login with the project scope (gh auth refresh -s project). Where the board cannot
# be reached (no scope, or a sandbox without GraphQL) it says so and exits 3: callers carry on,
# because the board's own workflows move items when a pull request is linked and merged.
set -euo pipefail

OWNER=clavia-auth
PROJECT=1

unreachable() {
  echo "board: the project board cannot be reached from here ($1); leaving it to its workflows" >&2
  exit 3
}

project_id() {
  gh project view "$PROJECT" --owner "$OWNER" --format json --jq .id 2>/dev/null || unreachable "gh project view failed"
}

set_option() { # url, field, option
  local url=$1 field=$2 option=$3 pid fields fid oid item
  pid=$(project_id)
  fields=$(gh project field-list "$PROJECT" --owner "$OWNER" --format json --limit 50) || unreachable "field-list failed"
  fid=$(jq -r --arg f "$field" '.fields[] | select(.name==$f) | .id' <<<"$fields")
  oid=$(jq -r --arg f "$field" --arg o "$option" \
    '.fields[] | select(.name==$f) | .options[]? | select(.name==$o) | .id' <<<"$fields")
  [ -n "$fid" ] || { echo "board: no field named $field" >&2; exit 2; }
  [ -n "$oid" ] || { echo "board: $field has no option $option" >&2; exit 2; }
  item=$(gh project item-add "$PROJECT" --owner "$OWNER" --url "$url" --format json --jq .id) \
    || unreachable "item-add failed"
  gh project item-edit --id "$item" --project-id "$pid" --field-id "$fid" \
    --single-select-option-id "$oid" >/dev/null || unreachable "item-edit failed"
  echo "board: $field → $option ($url)"
}

case "${1:-}" in
  show)
    gh project item-list "$PROJECT" --owner "$OWNER" --format json --limit 500 2>/dev/null \
      | jq -r '.items[] | select(.status != "Done")
          | [(.status // "-"), (.priority // "-"), (.size // "-"),
             ((.content.repository // "" | split("/") | last) + "#" + ((.content.number // 0) | tostring)),
             .title] | @tsv' \
      | sort -t$'\t' -k1,1 -k2,2 \
      || unreachable "item-list failed"
    ;;
  status) [ $# -eq 3 ] || { echo "usage: board.sh status <url> <Status>" >&2; exit 2; }
    set_option "$2" Status "$3" ;;
  set) [ $# -eq 4 ] || { echo "usage: board.sh set <url> <Field> <Value>" >&2; exit 2; }
    set_option "$2" "$3" "$4" ;;
  *) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
