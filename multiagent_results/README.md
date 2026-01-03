# Multi-Agent Results (Static Gallery)

Drop this folder into your GitHub Pages repo (e.g. `jiabenchen.github.io/multiagent_results/`), then visit:

`https://<username>.github.io/multiagent_results/`

## How to add scenes

1. Put videos into `videos/` (mp4 recommended).
2. Edit `scenes.json`.

Example entry:

```json
{
  "id": "scene-001",
  "title": "Scene 1 — Desert RV",
  "prompt": "Your prompt here...",
  "video": "./videos/scene001.mp4",
  "tags": ["exterior", "35mm"],
  "notes": "Optional notes (agent trace / critic feedback)."
}
```

## Notes

- If a video is too large, consider hosting it elsewhere and setting `video` to a full URL.
- GitHub Pages is case-sensitive: make sure filenames match exactly.
