export const formatFileSize = (size) =>
  `${(size / 1024).toFixed(1)} KB`;

export const reorderFiles = (files, fromIndex, toIndex) => {
  const arr = [...files];
  const [moved] = arr.splice(fromIndex, 1);
  arr.splice(toIndex, 0, moved);
  return arr;
};
