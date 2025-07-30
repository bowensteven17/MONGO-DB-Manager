// Enhanced Restore.js with Full Width Layout
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
    <div className="bg-gray-50 h-full flex flex-col">
      {/* Header with Auto-Refresh Controls */}
      <div className="bg-white shadow-sm border-b flex-shrink-0">
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
      <div className="bg-white border-b flex-shrink-0">
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

      {/* Main Content - Full Width Layout */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-6">
          <div className="bg-white rounded-lg shadow-sm border h-full">
            <div className="h-full p-6">
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
        </div>
      </div>
    </div>
  );
};

export default Restore;