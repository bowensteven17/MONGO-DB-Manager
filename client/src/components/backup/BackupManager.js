// src/components/backup/BackupManager.js
import { useState, useEffect } from 'react';
import CreateBackupModal from "./CreateBackupModal"
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
  const [backupSources, setBackupSources] = useState({});
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchBackups();
    fetchDatabases();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      
      // Fetch file system backups
      const fileSystemRes = await fetch('http://localhost:5000/api/backup/list');
      let allBackups = [];
      let backupSources = {}; // Track where each backup is stored
      
      if (fileSystemRes.ok) {
        const fileSystemData = await fileSystemRes.json();
        if (fileSystemData.success && fileSystemData.backups) {
          // Mark these as file system backups
          fileSystemData.backups.forEach(backup => {
            backupSources[backup.name] = { file_system: true, database: false };
          });
          allBackups = [...fileSystemData.backups];
        }
      }
      
      // Fetch database backups
      try {
        const databaseRes = await fetch('http://localhost:5000/api/backup/list-database');
        if (databaseRes.ok) {
          const databaseData = await databaseRes.json();
          if (databaseData.success && databaseData.backups) {
            // Mark these as database backups and merge with file system backups
            databaseData.backups.forEach(dbBackup => {
              const existingIndex = allBackups.findIndex(b => b.name === dbBackup.name);
              if (existingIndex >= 0) {
                // Backup exists in both locations
                backupSources[dbBackup.name] = { file_system: true, database: true };
              } else {
                // Database-only backup
                backupSources[dbBackup.name] = { file_system: false, database: true };
                allBackups.push(dbBackup);
              }
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch database backups:', error);
      }
      
      // Sort by creation date (newest first)
      allBackups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setBackups(allBackups);
      // Store backup sources info for displaying badges
      setBackupSources(backupSources); // Temporary storage, you could use state instead
      
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

  const handleCreateBackup = async (databaseName, backupName, destinations) => {
    try {
      const requestBody = {
        connection_string: connectionString,
        database_name: databaseName,
        backup_name: backupName,
        options: {
          destinations: {
            toFileSystem: destinations.toFileSystem,
            toDatabase: destinations.toDatabase
          }
        }
      };
  
      // Add backup database connection if provided
      if (destinations.backupDbConnection) {
        requestBody.backup_db_connection = destinations.backupDbConnection;
      }
  
      const res = await fetch('http://localhost:5000/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
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


  const handleDeleteBackup = async (backupName) => {
    // Get backup sources to determine what to delete
    const sources = backupSources[backupName] || {};
    const hasFileSystem = sources.file_system;
    const hasDatabase = sources.database;
    
    let deleteMessage = `Are you sure you want to delete backup "${backupName}"?`;
    
    if (hasFileSystem && hasDatabase) {
      deleteMessage = `Are you sure you want to delete backup "${backupName}" from both File System and Database storage?`;
    } else if (hasFileSystem) {
      deleteMessage = `Are you sure you want to delete backup "${backupName}" from File System storage?`;
    } else if (hasDatabase) {
      deleteMessage = `Are you sure you want to delete backup "${backupName}" from Database storage?`;
    }
  
    if (window.confirm(deleteMessage)) {
      try {
        const deletePromises = [];
        
        // Delete from file system if it exists there
        if (hasFileSystem) {
          const fileSystemDelete = fetch('http://localhost:5000/api/backup/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              backup_name: backupName,
              source: 'file_system',
              confirm: true
            })
          });
          deletePromises.push(fileSystemDelete);
        }
        
        // Delete from database if it exists there
        if (hasDatabase) {
          const databaseDelete = fetch('http://localhost:5000/api/backup/delete-database', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              backup_name: backupName,
              source: 'database',
              confirm: true
            })
          });
          deletePromises.push(databaseDelete);
        }
        
        // Wait for all deletions to complete
        const results = await Promise.all(deletePromises);
        
        // Check if all deletions were successful
        let allSuccessful = true;
        let errorMessages = [];
        
        for (let i = 0; i < results.length; i++) {
          const res = results[i];
          if (res.ok) {
            const result = await res.json();
            console.log('Delete result:', result);
          } else {
            allSuccessful = false;
            const error = await res.json();
            errorMessages.push(error.message);
          }
        }
        
        if (allSuccessful) {
          alert('Backup deleted successfully from all locations');
          fetchBackups(); // Refresh backup list
        } else {
          alert(`Delete partially failed: ${errorMessages.join(', ')}`);
          fetchBackups(); // Still refresh to see current state
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
                      {/* Storage location badges */}
                      <div className="flex items-center space-x-1 mt-1">
                        {backupSources[backup.name]?.file_system && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            File System
                          </span>
                        )}
                        {backupSources[backup.name]?.database && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Database
                          </span>
                        )}
                      </div>
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
                          : backup.method === 'database_storage'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {backup.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
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
    </div>
  );
}
export default BackupManager;