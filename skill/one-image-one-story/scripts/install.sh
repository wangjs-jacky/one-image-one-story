#!/usr/bin/env bash
set -euo pipefail

skill_source="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
if [[ ! -f "$skill_source/SKILL.md" ]]; then
  printf 'Skill source is missing SKILL.md: %s\n' "$skill_source" >&2
  exit 1
fi

if [[ -n "${CODEX_HOME:-}" ]]; then
  skills_directory="$CODEX_HOME/skills"
else
  skills_directory="${HOME:?Current user home directory is required}/.codex/skills"
fi
install_target="$skills_directory/one-image-one-story"

if [[ -L "$install_target" ]]; then
  if [[ "$(readlink "$install_target")" == "$skill_source" ]]; then
    printf 'Already installed: %s -> %s\n' "$install_target" "$skill_source"
    exit 0
  fi
  unlink "$install_target"
elif [[ -e "$install_target" ]]; then
  printf 'Refusing to overwrite a real file or directory: %s\n' "$install_target" >&2
  exit 1
fi

mkdir -p -- "$skills_directory"
ln -s -- "$skill_source" "$install_target"
printf 'Installed: %s -> %s\n' "$install_target" "$skill_source"
