// Option 1: Enhanced Restore.js with Auto-Refresh Controls
import React, { useState } from 'react';
import { UploadIcon, DatabaseIcon, CollectionIcon } from '@heroicons/react/outline';
import RestoreDatabase from './RestoreDatabase';
import RestoreCollections from './RestoreCollections';

const Restore = ({ serverUrl, onRestoreSuccess }) => {
  const [activeTab, setActiveTab] = useState('database');
  const [connectionString, setConnectionString] = useState(serverUrl || 'mongodb://localhost:27017');
  const [uploadedBackupInfo, setUploadedBackupInfo] = useState(null);
  const [restoreHistory, setRestoreHistory] = useState([]);
  

  const handleRestoreComplete = (result) => {
    // Add to restore history
    const historyEntry = {
      id: Date.now(),
      timestamp: new Date(),
      type: activeTab,
      result: result
    };
    setRestoreHistory(prev => [historyEntry, ...prev].slice(0, 10));

    // Trigger immediate refresh after successful restore
    if (result.success && onRestoreSuccess) {
      setTimeout(() => {
        onRestoreSuccess();
      }, 1000); // Wait 1 second for database to update
    }
  };

  const tabs = [
    {
      id: 'database',
      name: 'Database Restore',
      icon: DatabaseIcon,
      description: 'Restore entire database'
    },
    {
      id: 'collections',
      name: 'Collection Restore',
      icon: CollectionIcon,
      description: 'Restore specific collections'
    }
  ];

  return (
    <div className="bg-gray-50 h-full">
      {/* Header with Auto-Refresh Controls */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <UploadIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Restore Management</h1>
                <p className="text-sm text-gray-500">Restore databases and collections from backup files</p>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="px-6">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  <div className="text-left">
                    <div>{tab.name}</div>
                    <div className="text-xs opacity-75">{tab.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Restore Panel */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                {activeTab === 'database' && (
                  <RestoreDatabase
                    connectionString={connectionString}
                    setConnectionString={setConnectionString}
                    uploadedBackupInfo={uploadedBackupInfo}
                    setUploadedBackupInfo={setUploadedBackupInfo}
                    onRestoreComplete={handleRestoreComplete}
                  />
                )}
                
                {activeTab === 'collections' && (
                  <RestoreCollections
                    connectionString={connectionString}
                    setConnectionString={setConnectionString}
                    uploadedBackupInfo={uploadedBackupInfo}
                    setUploadedBackupInfo={setUploadedBackupInfo}
                    onRestoreComplete={handleRestoreComplete}
                  />
                )}
              </div>
            </div>

            {/* Enhanced Sidebar */}
            <div className="space-y-6">


              {/* Current Backup Info */}
              {uploadedBackupInfo && (
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Current Backup</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Database:</span>
                      <span className="text-xs text-gray-700 font-medium">{uploadedBackupInfo.database}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Collections:</span>
                      <span className="text-xs text-gray-700">{uploadedBackupInfo.collections?.length || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Method:</span>
                      <span className="text-xs text-gray-700">{uploadedBackupInfo.method || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Restore History */}
              {restoreHistory.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="mb-3">
                    <h3 className="text-sm font-medium text-gray-900">Recent Restores</h3>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {restoreHistory.map((entry) => (
                      <div key={entry.id} className="border-l-2 border-green-200 pl-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-900 capitalize">
                            {entry.type} Restore
                          </span>
                          <span className="text-xs text-gray-500">
                            {entry.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Target: {entry.result.restore?.target_database}
                        </p>
                        {entry.result.restore?.collections_restored && (
                          <p className="text-xs text-gray-500">
                            {Array.isArray(entry.result.restore.collections_restored)
                              ? `${entry.result.restore.collections_restored.length} collections`
                              : 'All collections'
                            }
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Restore;