const activeFile = dc.resolvePath("AQUARIUM") || "_RESOURCES/DATACORE/AQUARIUM/AQUARIUM";
const folderPath = activeFile.substring(0, activeFile.lastIndexOf('/'));
const { View } = await dc.require(folderPath + "/src/App.jsx");
return { View };
