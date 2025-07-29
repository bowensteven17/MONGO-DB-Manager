import { useState } from 'react';
import {
  DatabaseIcon,
  ArchiveIcon,
  UploadIcon,
  CogIcon,
  ServerIcon,
  LogoutIcon,
  RefreshIcon
} from '@heroicons/react/outline';

function Sidebar({ 
  databases = [], 
  serverUrl, 
  onDisconnect, 
  onRefreshDatabases, 
  activeSection = 'databases',
  onSectionChange,
  isLoadingDatabases = false 
}) {
  const [selectedDatabase, setSelectedDatabase] = useState(null);

  const navigationSections = [
    {
      id: 'databases',
      name: 'Databases',
      icon: DatabaseIcon,
      description: 'Browse and manage databases'
    },
    {
      id: 'backup',
      name: 'Backup',
      icon: ArchiveIcon,
      description: 'Create database backups'
    },
    {
      id: 'restore',
      name: 'Restore',
      icon: UploadIcon,
      description: 'Restore from backups'
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: CogIcon,
      description: 'Application settings'
    }
  ];

  const handleSectionChange = (sectionId) => {
    if (onSectionChange) {
      onSectionChange(sectionId);
    }
  };

  const handleDatabaseSelect = (database) => {
    setSelectedDatabase(database);
    // Future: This will be used in Step 2 for database selection
  };

  const formatDatabaseSize = (sizeInBytes) => {
    if (!sizeInBytes) return 'N/A';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = sizeInBytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className="flex flex-col h-screen w-80 bg-gray-900 text-gray-100 border-r border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center">
          <DatabaseIcon className="h-8 w-8 text-blue-400 mr-3" />
          <div>
            <h1 className="text-lg font-bold text-white">MongoDB Explorer</h1>
            <p className="text-xs text-gray-400 truncate max-w-48">
              {serverUrl}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 flex flex-col">
        {/* Navigation Menu */}
        <nav className="px-4 py-4 border-b border-gray-700">
          <div className="space-y-1">
            {navigationSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              return (
                <button
                  key={section.id}
                  onClick={() => handleSectionChange(section.id)}
                  className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{section.name}</div>
                    <div className="text-xs opacity-75">{section.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Dynamic Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Navigation sections info only - no database listing here */}
          <div className="p-4">
            <div className="text-center py-8">
              <div className="mx-auto mb-4">
                {activeSection === 'databases' && <DatabaseIcon className="h-8 w-8 text-blue-400 mx-auto" />}
                {activeSection === 'backup' && <ArchiveIcon className="h-8 w-8 text-orange-400 mx-auto" />}
                {activeSection === 'restore' && <UploadIcon className="h-8 w-8 text-green-400 mx-auto" />}
                {activeSection === 'settings' && <CogIcon className="h-8 w-8 text-gray-400 mx-auto" />}
              </div>
              
              {activeSection === 'databases' && (
                <div>
                  <h3 className="text-sm font-medium text-gray-200 mb-2">Database Management</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Browse and manage your MongoDB databases. View database details, 
                    collections, and perform operations from the main area.
                  </p>
                </div>
              )}
              
              {activeSection === 'backup' && (
                <div>
                  <h3 className="text-sm font-medium text-gray-200 mb-2">Backup Operations</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Create secure backups of your databases. Export data and 
                    maintain copies for disaster recovery.
                  </p>
                </div>
              )}
              
              {activeSection === 'restore' && (
                <div>
                  <h3 className="text-sm font-medium text-gray-200 mb-2">Restore Operations</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Restore databases from backup files. Import data and 
                    recover from previous states.
                  </p>
                </div>
              )}
              
              {activeSection === 'settings' && (
                <div>
                  <h3 className="text-sm font-medium text-gray-200 mb-2">Application Settings</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Configure application preferences, connection settings, 
                    and customize your MongoDB Explorer experience.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Connection Info & Actions */}
      <div className="flex-shrink-0 border-t border-gray-700 bg-gray-800">
        {/* Connection Status */}
        <div className="px-4 py-3 border-b border-gray-700">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 flex-shrink-0"></div>
            <ServerIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-400">Connected to:</p>
              <p className="text-xs text-gray-300 font-mono truncate">{serverUrl}</p>
            </div>
          </div>
        </div>

        {/* Disconnect Button */}
        <div className="p-4">
          <button
            onClick={onDisconnect}
            className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 hover:text-white transition-colors"
          >
            <LogoutIcon className="h-4 w-4 mr-2" />
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;