// src/components/backup/BackupManager.js
import { useState, useEffect } from 'react';
import {
  ArchiveIcon,
  UploadIcon,
  TrashIcon,
  DownloadIcon,
  DatabaseIcon,
  RefreshIcon,
  ExclamationIcon,
  PlusIcon,
  ClockIcon
} from '@heroicons/react/outline';

function BackupManager() {
  const [backups, setBackups] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connectionString] = useState("mongodb://localhost:27017");
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [selectedDatabase, setSelectedDatabase] = useState('');

  useEffect(() => {
    fetchBackups();
    fetchDatabases();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/backup/list');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.backups) {
          setBackups(data.backups);
        }
      }
    } catch (error) {
      console.error('Failed to fetch backups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDatabases = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/database/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_string: connectionString })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.databases) {
          setDatabases(data.databases);
        }
      }
    } catch (error) {
      console.error('Failed to fetch databases:', error);
    }
  };

  const handleCreateBackup = async (databaseName, backupName) => {
    try {
      const res = await fetch('http://localhost:5000/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection_string: connectionString,
          database_name: databaseName,
          backup_name: backupName
        })
      });

      if (res.ok) {
        const result = await res.json();
        alert(`Backup created successfully: ${result.backup.name}`);
        fetchBackups(); // Refresh backup list
        setShowCreateModal(false);
      } else {
        const error = await res.json();
        alert(`Backup failed: ${error.message}`);
      }
    } catch (error) {
      alert(`Backup failed: ${error.message}`);
    }
  };

  const handleRestoreBackup = async (backupName, targetDatabase) => {
    try {
      const res = await fetch('http://localhost:5000/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection_string: connectionString,
          backup_name: backupName,
          target_database: targetDatabase,
          confirm: true
        })
      });

      if (res.ok) {
        const result = await res.json();
        alert(`Backup restored successfully to: ${result.restore.target_database}`);
        setShowRestoreModal(false);
        setSelectedBackup(null);
      } else {
        const error = await res.json();
        alert(`Restore failed: ${error.message}`);
      }
    } catch (error) {
      alert(`Restore failed: ${error.message}`);
    }
  };

  const handleDeleteBackup = async (backupName) => {
    if (window.confirm(`Are you sure you want to delete backup "${backupName}"?`)) {
      try {
        const res = await fetch('http://localhost:5000/api/backup/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            backup_name: backupName,
            confirm: true
          })
        });

        if (res.ok) {
          alert('Backup deleted successfully');
          fetchBackups(); // Refresh backup list
        } else {
          const error = await res.json();
          alert(`Delete failed: ${error.message}`);
        }
      } catch (error) {
        alert(`Delete failed: ${error.message}`);
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Backup Manager</h1>
            <p className="text-gray-600 mt-1">Create, restore, and manage MongoDB backups</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Backup
            </button>
            <button
              onClick={fetchBackups}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <RefreshIcon className="h-5 w-5 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ArchiveIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Total Backups</h3>
              <p className="text-2xl font-bold text-blue-600">{backups.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <DatabaseIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Databases</h3>
              <p className="text-2xl font-bold text-green-600">{databases.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Latest Backup</h3>
              <p className="text-sm text-gray-600">
                {backups.length > 0 ? formatDate(backups[0].created_at) : 'No backups'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Backups Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Available Backups</h2>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading backups...</span>
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-12">
            <ArchiveIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No backups found</h3>
            <p className="text-gray-600 mb-4">Create your first backup to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Create Backup
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Database
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {backups.map((backup) => (
                  <tr key={backup.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{backup.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {backup.database}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {backup.size_formatted || formatSize(backup.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(backup.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        backup.method === 'mongodump' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {backup.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedBackup(backup);
                            setShowRestoreModal(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                          title="Restore backup"
                        >
                          <UploadIcon className="h-5 w-5" />
                        </button>
                        <a
                          href={`http://localhost:5000/api/backup/download/${backup.name}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="Download backup"
                        >
                          <DownloadIcon className="h-5 w-5" />
                        </a>
                        <button
                          onClick={() => handleDeleteBackup(backup.name)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete backup"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Backup Modal */}
      {showCreateModal && (
        <CreateBackupModal
          databases={databases}
          onClose={() => setShowCreateModal(false)}
          onCreateBackup={handleCreateBackup}
        />
      )}

      {/* Restore Backup Modal */}
      {showRestoreModal && selectedBackup && (
        <RestoreBackupModal
          backup={selectedBackup}
          databases={databases}
          onClose={() => {
            setShowRestoreModal(false);
            setSelectedBackup(null);
          }}
          onRestoreBackup={handleRestoreBackup}
        />
      )}
    </div>
  );
}

// Create Backup Modal Component
function CreateBackupModal({ databases, onClose, onCreateBackup }) {
  const [selectedDb, setSelectedDb] = useState('');
  const [backupName, setBackupName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedDb) {
      onCreateBackup(selectedDb, backupName || undefined);
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

// Restore Backup Modal Component
function RestoreBackupModal({ backup, databases, onClose, onRestoreBackup }) {
  const [targetDb, setTargetDb] = useState(backup.database);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (window.confirm(`Are you sure you want to restore "${backup.name}" to "${targetDb}"? This will overwrite existing data.`)) {
      onRestoreBackup(backup.name, targetDb);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Restore Backup</h3>
        <div className="mb-4 p-3 bg-gray-100 rounded-md">
          <p className="text-sm text-gray-600">Backup: <strong>{backup.name}</strong></p>
          <p className="text-sm text-gray-600">Original Database: <strong>{backup.database}</strong></p>
          <p className="text-sm text-gray-600">Size: <strong>{backup.size_formatted}</strong></p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Database
            </label>
            <select
              value={targetDb}
              onChange={(e) => setTargetDb(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {databases.map((db) => (
                <option key={db.name} value={db.name}>
                  {db.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-red-600 mt-1">
              Warning: This will overwrite existing data in the target database!
            </p>
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
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Restore Backup
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BackupManager;