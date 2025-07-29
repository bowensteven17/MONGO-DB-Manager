import { useState } from "react";
// Create Backup Modal Component
function CreateBackupModal({ databases, onClose, onCreateBackup }) {
    const [selectedDb, setSelectedDb] = useState('');
    const [backupName, setBackupName] = useState('');
    const [backupToFileSystem, setBackupToFileSystem] = useState(true);
    const [backupToDatabase, setBackupToDatabase] = useState(false);
    const [backupDbConnection, setBackupDbConnection] = useState('');
    const handleSubmit = (e) => {
      e.preventDefault();
      if (!backupToFileSystem && !backupToDatabase) {
        alert('Please select at least one backup destination.');
        return;
      }
      if (selectedDb) {
        // Pass the new destination options as an object
        onCreateBackup(selectedDb, backupName || undefined, {
          toFileSystem: backupToFileSystem,
          toDatabase: backupToDatabase,
        });
      }
    };
  
    
  
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Backup</h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Database
              </label>
              <select
                value={selectedDb}
                onChange={(e) => setSelectedDb(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Choose a database...</option>
                {databases.map((db) => (
                  <option key={db.name} value={db.name}>
                    {db.name} ({db.collections} collections)
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Backup Name (optional)
              </label>
              <input
                type="text"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                placeholder="Leave empty for auto-generated name"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Backup Database Connection (optional)
            </label>
            <input
                type="text"
                value={backupDbConnection}
                onChange={(e) => setBackupDbConnection(e.target.value)}
                placeholder="mongodb://localhost:27017 (leave empty to use default)"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
                Only needed if backing up to database with different connection
            </p>
            </div>
  
            {/* ADD THIS NEW SECTION FOR CHECKBOXES */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Backup Destination
              </label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    id="toFileSystem"
                    type="checkbox"
                    checked={backupToFileSystem}
                    onChange={(e) => setBackupToFileSystem(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="toFileSystem" className="ml-2 block text-sm text-gray-900">
                    Back Up to File System
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="toDatabase"
                    type="checkbox"
                    checked={backupToDatabase}
                    onChange={(e) => setBackupToDatabase(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="toDatabase" className="ml-2 block text-sm text-gray-900">
                    Back Up to Database
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Backup
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
  
  
  export default CreateBackupModal;