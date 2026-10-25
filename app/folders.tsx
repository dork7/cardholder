import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useApp } from '../src/app/AppProvider';
import { Folder } from '../src/cards/types';
import { strings } from '../src/strings';
import { Button } from '../src/ui/Button';
import { FolderNameInput } from '../src/ui/FolderNameInput';
import { Panel, Screen } from '../src/ui/Surface';
import { Text } from '../src/ui/Text';
import { TYPE, useTheme } from '../src/ui/theme';

// Create, rename and delete folders. Cards go into a folder from their edit screen.
export default function FoldersScreen() {
  const { services, cards, folders, refresh } = useApp();
  const theme = useTheme();
  // What is being named: a new folder, or the id of the folder being renamed.
  const [naming, setNaming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (write: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await write();
      setNaming(null);
    } catch (e) {
      console.warn('Folder change failed', e);
      Alert.alert(strings.common.error);
    } finally {
      setBusy(false);
      await refresh().catch((e) => console.warn('Refresh after folder change failed', e));
    }
  };

  const confirmDelete = (folder: Folder) =>
    Alert.alert(strings.folders.deleteConfirmTitle(folder.name), strings.folders.deleteConfirmBody, [
      { text: strings.common.cancel, style: 'cancel' },
      { text: strings.common.delete, style: 'destructive', onPress: () => run(() => services.store.removeFolder(folder.id)) },
    ]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Panel style={styles.section}>
          {naming === 'new' ? (
            <FolderNameInput
              folders={folders}
              submitLabel={strings.folders.create}
              onSubmit={(name) => run(() => services.store.createFolder(name))}
              onCancel={() => setNaming(null)}
              testIDPrefix="new-folder"
            />
          ) : (
            <Button label={strings.folders.newFolder} onPress={() => setNaming('new')} testID="new-folder" />
          )}
        </Panel>
        {folders.length === 0 ? (
          <Text style={[styles.body, styles.empty, { color: theme.muted }]} testID="no-folders">
            {strings.folders.empty}
          </Text>
        ) : (
          folders.map((folder) => (
            <Panel key={folder.id} style={styles.section}>
              {naming === folder.id ? (
                <FolderNameInput
                  folders={folders}
                  initial={folder.name}
                  renamingId={folder.id}
                  submitLabel={strings.common.save}
                  onSubmit={(name) => run(() => services.store.renameFolder(folder.id, name))}
                  onCancel={() => setNaming(null)}
                  testIDPrefix={`rename-${folder.id}`}
                />
              ) : (
                <>
                  <View>
                    <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
                      {folder.name}
                    </Text>
                    <Text style={[styles.caption, { color: theme.muted }]}>
                      {strings.folders.count(cards.filter((c) => c.folderId === folder.id).length)}
                    </Text>
                  </View>
                  {/* Rename first; Delete is destructive, so it sits last. */}
                  <View style={styles.actions}>
                    <View style={styles.action}>
                      <Button
                        variant="secondary"
                        label={strings.folders.rename}
                        onPress={() => setNaming(folder.id)}
                        testID={`rename-${folder.id}`}
                      />
                    </View>
                    <View style={styles.action}>
                      <Button
                        variant="danger"
                        label={strings.common.delete}
                        onPress={() => confirmDelete(folder)}
                        testID={`delete-${folder.id}`}
                      />
                    </View>
                  </View>
                </>
              )}
            </Panel>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  section: { padding: 16, gap: 12 },
  title: { fontSize: TYPE.section, fontWeight: '700' },
  body: { fontSize: TYPE.body },
  empty: { textAlign: 'center', paddingHorizontal: 16 },
  caption: { fontSize: TYPE.secondary },
  actions: { flexDirection: 'row', gap: 12 },
  action: { flex: 1 },
});
