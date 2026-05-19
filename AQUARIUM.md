---
fishes:
  - name: Brush Teeth
  - name: Read
  - name: Exercise
  - name: Journal
  - name: Code
  - name: Vitamins
---

```datacorejsx
const activeFile = dc.resolvePath("AQUARIUM") || "_RESOURCES/DATACORE/AQUARIUM/AQUARIUM";
const folderPath = activeFile.substring(0, activeFile.lastIndexOf('/'));
const { View } = await dc.require(folderPath + "/src/index.jsx");
const fishes = dc.currentFile()?.frontmatter?.fishes || [
  { name: 'Brush Teeth' },
  { name: 'Read' },
  { name: 'Exercise' },
  { name: 'Journal' },
  { name: 'Code' },
  { name: 'Vitamins' },
];
return await View({ folderPath, dc, fishes });
```
