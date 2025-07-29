import { useState, useEffect } from 'react';
import {
  DatabaseIcon,
  CollectionIcon,
  DocumentTextIcon,
  ArchiveIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  RefreshIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon
} from '@heroicons/react/outline';

function BackUp({ serverUrl }) {
  // View state
  const [activeView, setActiveView] = useState('database'); // 'database' or 'collections'
  
  // Data state
  const [databases, setDatabases] = useState([]);
  const [collectionsData, setCollectionsData] = useState({});
  const [expandedDatabases, setExpandedDatabases] = useState(new Set());
  
  // Selection state
  const [selectedDatabases, setSelectedDatabases] = useState(new Set());
  const [selectedCollections, setSelectedCollections] = useState(new Set());
  const [selectedDatabase, setSelectedDatabase] = useState(''); // For collections backup - only one database at a time
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchDatabases();
  }, []);

  // Clear selections when changing views
  useEffect(() => {
    if (activeView === 'database') {
      setSelectedCollections(new Set());
      setSelectedDatabase('');
    } else {
      setSelectedDatabases(new Set());
    }
  }, [activeView]);

  const fetchDatabases = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:5000/api/database/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connection_string: serverUrl
        })
      });

      const result = await response.json();

      if (result.success && result.databases) {
        setDatabases(result.databases);
      } else {
        setError('Failed to fetch databases: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      setError('Failed to fetch databases: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCollections = async (databaseName) => {
    try {
      const response = await fetch('http://localhost:5000/api/collection/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connection_string: serverUrl,
          database_name: databaseName
        })
      });

      const result = await response.json();

      if (result.success && result.collections) {
        setCollectionsData(prev => ({
          ...prev,
          [databaseName]: result.collections
        }));
      }
    } catch (error) {
      console.error('Failed to fetch collections for', databaseName, error);
    }
  };

  const toggleDatabaseExpansion = async (databaseName) => {
    const newExpanded = new Set(expandedDatabases);
    
    if (expandedDatabases.has(databaseName)) {
      newExpanded.delete(databaseName);
    } else {
      newExpanded.add(databaseName);
      // Fetch collections if we don't have them yet
      if (!collectionsData[databaseName]) {
        await fetchCollections(databaseName);
      }
    }
    
    setExpandedDatabases(newExpanded);
  };

  const handleDatabaseSelection = (databaseName) => {
    const newSelected = new Set(selectedDatabases);
    
    if (selectedDatabases.has(databaseName)) {
      newSelected.delete(databaseName);
    } else {
      newSelected.add(databaseName);
    }
    
    setSelectedDatabases(newSelected);
  };

  const handleCollectionSelection = (databaseName, collectionName) => {
    // If selecting from a different database, clear previous selections
    if (selectedDatabase && selectedDatabase !== databaseName) {
      setSelectedCollections(new Set());
      setSelectedDatabase(databaseName);
    } else if (!selectedDatabase) {
      setSelectedDatabase(databaseName);
    }

    const collectionKey = `${databaseName}.${collectionName}`;
    const newSelected = new Set(selectedCollections);
    
    if (selectedCollections.has(collectionKey)) {
      newSelected.delete(collectionKey);
      // If no collections selected, reset selected database
      if (newSelected.size === 0) {
        setSelectedDatabase('');
      }
    } else {
      newSelected.add(collectionKey);
    }
    
    setSelectedCollections(newSelected);
  };

  const handleSelectAllDatabases = () => {
    if (selectedDatabases.size === databases.length) {
      setSelectedDatabases(new Set());
    } else {
      setSelectedDatabases(new Set(databases.map(db => db.name)));
    }
  };

  const handleSelectAllCollections = (databaseName) => {
    const collections = collectionsData[databaseName] || [];
    const collectionKeys = collections.map(col => `${databaseName}.${col.name}`);
    
    // Check if all collections in this database are selected
    const allSelected = collectionKeys.every(key => selectedCollections.has(key));
    
    if (allSelected) {
      // Deselect all collections from this database
      const newSelected = new Set(selectedCollections);
      collectionKeys.forEach(key => newSelected.delete(key));
      setSelectedCollections(newSelected);
      if (newSelected.size === 0) {
        setSelectedDatabase('');
      }
    } else {
      // Select all collections from this database (clear other selections first)
      setSelectedDatabase(databaseName);
      setSelectedCollections(new Set(collectionKeys));
    }
  };

  const downloadBackup = async (backupName) => {
    try {
      console.log('Attempting to download backup:', backupName);
      
      // First, let's check what backups are actually available
      const listResponse = await fetch('http://localhost:5000/api/backup/list-files');
      const listResult = await listResponse.json();
      console.log('Available backup files:', listResult);
      
      const response = await fetch(`http://localhost:5000/api/backup/download/${encodeURIComponent(backupName)}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Download failed - Status: ${response.status}, Response:`, errorText);
        
        // Try to parse error response
        try {
          const errorJson = JSON.parse(errorText);
          setError(`Download failed: ${errorJson.message || errorJson.error}`);
        } catch {
          setError(`Download failed: ${response.status} ${response.statusText}`);
        }
        return;
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      console.log('Response content type:', contentType);

      // Create blob and download
      const blob = await response.blob();
      console.log('Blob size:', blob.size);
      
      if (blob.size === 0) {
        setError(`Download failed: Empty file received for ${backupName}`);
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `${backupName}.zip`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log(`Successfully downloaded: ${filename}`);
      
    } catch (error) {
      console.error(`Error downloading backup ${backupName}:`, error);
      setError(`Download error: ${error.message}`);
    }
  };

  const handleBackup = async () => {
    if (activeView === 'database' && selectedDatabases.size === 0) {
      setError('Please select at least one database to backup');
      return;
    }
    
    if (activeView === 'collections' && selectedCollections.size === 0) {
      setError('Please select at least one collection to backup');
      return;
    }

    setIsBackingUp(true);
    setError('');
    setSuccessMessage('');

    try {
      const backupResults = [];

      if (activeView === 'database') {
        // Backup entire selected databases
        for (const databaseName of selectedDatabases) {
          const response = await fetch('http://localhost:5000/api/backup/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              connection_string: serverUrl,
              database_name: databaseName,
              options: {
                gzip: true // Enable compression
              }
            })
          });

          const result = await response.json();
          
          if (!result.success) {
            throw new Error(`Failed to backup database ${databaseName}: ${result.message}`);
          }
          
          // Debug: Log the full response to see the structure
          console.log('Backup creation response:', result);
          
          // Try multiple possible fields for the backup name
          let backupName = null;
          
          // Check various possible locations for the backup name
          if (result.backup) {
            backupName = result.backup.name || result.backup.path?.split('/').pop() || result.backup.backup_name;
          }
          
          // Fallback checks
          if (!backupName) {
            backupName = result.backup_name || result.name || result.filename;
          }
          
          // Final fallback - generate expected name
          if (!backupName) {
            backupName = `${databaseName}_backup`;
          }
          
          console.log('Using backup name for download:', backupName);
          
          backupResults.push({
            type: 'database',
            name: databaseName,
            backupName: backupName
          });
        }
        
        setSuccessMessage(`Successfully created backups for ${selectedDatabases.size} database(s). Downloads will start automatically.`);
        setSelectedDatabases(new Set());
        
      } else {
        // Backup databases with only selected collections
        const collectionsByDatabase = {};
        
        // Group selected collections by database
        selectedCollections.forEach(collectionKey => {
          const [databaseName, collectionName] = collectionKey.split('.');
          if (!collectionsByDatabase[databaseName]) {
            collectionsByDatabase[databaseName] = [];
          }
          collectionsByDatabase[databaseName].push(collectionName);
        });

        // Create database backups with only selected collections for each database
        for (const [databaseName, collections] of Object.entries(collectionsByDatabase)) {
          const allCollections = collectionsData[databaseName] || [];
          const isPartialBackup = collections.length < allCollections.length;
          
          if (isPartialBackup) {
            // Create a database backup with only selected collections
            const response = await fetch('http://localhost:5000/api/backup/create', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                connection_string: serverUrl,
                database_name: databaseName,
                options: {
                  collections: collections, // Array of collection names to include
                  gzip: true,
                  partial: true // Flag to indicate this is a partial backup
                }
              })
            });

            const result = await response.json();
            
            if (!result.success) {
              throw new Error(`Failed to backup selected collections from ${databaseName}: ${result.message}`);
            }
            
            // Debug: Log the full response to see the structure
            console.log('Partial backup creation response:', result);
            
            // Try multiple possible fields for the backup name
            let backupName = null;
            
            // Check various possible locations for the backup name
            if (result.backup) {
              backupName = result.backup.name || result.backup.path?.split('/').pop() || result.backup.backup_name;
            }
            
            // Fallback checks
            if (!backupName) {
              backupName = result.backup_name || result.name || result.filename;
            }
            
            // Final fallback - generate expected name
            if (!backupName) {
              backupName = `${databaseName}_partial_backup`;
            }
            
            console.log('Using partial backup name for download:', backupName);
            
            backupResults.push({
              type: 'partial_database',
              name: `${databaseName} (${collections.length} collections)`,
              backupName: backupName,
              collections: collections
            });
          } else {
            // All collections selected, backup entire database
            const response = await fetch('http://localhost:5000/api/backup/create', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                connection_string: serverUrl,
                database_name: databaseName,
                options: {
                  gzip: true
                }
              })
            });

            const result = await response.json();
            
            if (!result.success) {
              throw new Error(`Failed to backup database ${databaseName}: ${result.message}`);
            }
            
            // Debug: Log the full response to see the structure
            console.log('Complete backup creation response:', result);
            
            // Try multiple possible fields for the backup name
            let backupName = null;
            
            // Check various possible locations for the backup name
            if (result.backup) {
              backupName = result.backup.name || result.backup.path?.split('/').pop() || result.backup.backup_name;
            }
            
            // Fallback checks
            if (!backupName) {
              backupName = result.backup_name || result.name || result.filename;
            }
            
            // Final fallback - generate expected name
            if (!backupName) {
              backupName = `${databaseName}_backup`;
            }
            
            console.log('Using complete backup name for download:', backupName);
            
            backupResults.push({
              type: 'database',
              name: databaseName,
              backupName: backupName
            });
          }
        }
        
        const totalCollections = selectedCollections.size;
        const totalDatabases = Object.keys(collectionsByDatabase).length;
        setSuccessMessage(`Successfully created backups for ${totalCollections} collection(s) across ${totalDatabases} database(s). Downloads will start automatically.`);
        setSelectedCollections(new Set());
        setSelectedDatabase('');
      }

      // Trigger downloads for all created backups
      setTimeout(() => {
        backupResults.forEach((backup, index) => {
          setTimeout(() => {
            downloadBackup(backup.backupName);
          }, index * 1000); // Stagger downloads by 1 second
        });
      }, 1000);

    } catch (error) {
      setError(error.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return 'N/A';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className="bg-gray-50 h-full">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg mr-3">
                <ArchiveIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Backup Management</h1>
                <p className="text-sm text-gray-500">Create backups of your databases and collections</p>
              </div>
            </div>
            <button
              onClick={fetchDatabases}
              disabled={isLoading}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              <RefreshIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-center">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveView('database')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeView === 'database'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <DatabaseIcon className="h-4 w-4 mr-2 inline" />
                Databases
              </button>
              <button
                onClick={() => setActiveView('collections')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeView === 'collections'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <CollectionIcon className="h-4 w-4 mr-2 inline" />
                Collections
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="px-6 py-4">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-3" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3" />
              <span className="text-green-700 text-sm">{successMessage}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="px-6 pb-24">
        {activeView === 'database' ? (
          // Database View
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Select Databases to Backup</h2>
                <button
                  onClick={handleSelectAllDatabases}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {selectedDatabases.size === databases.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshIcon className="animate-spin h-6 w-6 text-blue-500 mr-2" />
                  <span className="text-gray-500">Loading databases...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {databases.map((database, index) => (
                    <div
                      key={index}
                      onClick={() => handleDatabaseSelection(database.name)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedDatabases.has(database.name)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedDatabases.has(database.name)}
                            onChange={() => handleDatabaseSelection(database.name)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-3"
                          />
                          <DatabaseIcon className="h-5 w-5 text-blue-500 mr-3" />
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">{database.name}</h3>
                            <p className="text-xs text-gray-500">
                              {formatBytes(database.sizeOnDisk)} • {database.collections || 0} collections
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            database.empty 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {database.empty ? 'Empty' : 'Active'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Collections View
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Select Collections to Backup</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedDatabase 
                      ? `Selecting collections from: ${selectedDatabase} (${selectedCollections.size} selected)`
                      : 'Choose collections from one database at a time'
                    }
                  </p>
                </div>
                {selectedDatabase && (
                  <button
                    onClick={() => {
                      setSelectedCollections(new Set());
                      setSelectedDatabase('');
                    }}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshIcon className="animate-spin h-6 w-6 text-blue-500 mr-2" />
                  <span className="text-gray-500">Loading databases...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {databases.map((database, index) => {
                    const isSelectedDatabase = selectedDatabase === database.name;
                    const hasSelectionsFromThisDb = selectedDatabase === database.name && selectedCollections.size > 0;
                    const isDisabled = selectedDatabase && selectedDatabase !== database.name;
                    
                    return (
                      <div key={index} className={`border rounded-lg ${
                        isSelectedDatabase ? 'border-blue-300 bg-blue-50' : 
                        isDisabled ? 'border-gray-200 bg-gray-50 opacity-60' : 
                        'border-gray-200'
                      }`}>
                        {/* Database Header */}
                        <div
                          onClick={() => !isDisabled && toggleDatabaseExpansion(database.name)}
                          className={`p-4 transition-colors ${
                            isDisabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              {expandedDatabases.has(database.name) ? (
                                <ChevronDownIcon className="h-4 w-4 text-gray-400 mr-2" />
                              ) : (
                                <ChevronRightIcon className="h-4 w-4 text-gray-400 mr-2" />
                              )}
                              <DatabaseIcon className={`h-5 w-5 mr-3 ${
                                isSelectedDatabase ? 'text-blue-600' : 'text-blue-500'
                              }`} />
                              <div>
                                <div className="flex items-center">
                                  <h3 className={`text-sm font-medium ${
                                    isSelectedDatabase ? 'text-blue-900' : 'text-gray-900'
                                  }`}>{database.name}</h3>
                                  {isSelectedDatabase && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      Selected
                                    </span>
                                  )}
                                  {isDisabled && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                      Disabled
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">
                                  {formatBytes(database.sizeOnDisk)} • {database.collections || 0} collections
                                  {hasSelectionsFromThisDb && (
                                    <span className="text-blue-600 font-medium ml-1">
                                      • {selectedCollections.size} selected
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            {expandedDatabases.has(database.name) && collectionsData[database.name] && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectAllCollections(database.name);
                                }}
                                disabled={isDisabled}
                                className={`text-sm font-medium transition-colors ${
                                  isDisabled ? 'text-gray-400 cursor-not-allowed' :
                                  'text-blue-600 hover:text-blue-700'
                                }`}
                              >
                                {collectionsData[database.name] && 
                                collectionsData[database.name].every(col => 
                                  selectedCollections.has(`${database.name}.${col.name}`)
                                ) ? 'Deselect All' : 'Select All'}
                              </button>
                            )}
                          </div>
                        </div>

                      {/* Collections List */}
                      {expandedDatabases.has(database.name) && (
                        <div className="border-t border-gray-200 bg-gray-50">
                          {collectionsData[database.name] ? (
                            collectionsData[database.name].length === 0 ? (
                              <div className="p-4 text-center text-gray-500 text-sm">
                                No collections found
                              </div>
                            ) : (
                              <div className="p-4 space-y-2">
                                {isDisabled && (
                                  <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                                    <p className="text-xs text-yellow-700 text-center">
                                      Collections from "{selectedDatabase}" are currently selected. Clear selection to choose from this database.
                                    </p>
                                  </div>
                                )}
                                {collectionsData[database.name].map((collection, collIndex) => {
                                  const collectionKey = `${database.name}.${collection.name}`;
                                  const isCollectionSelected = selectedCollections.has(collectionKey);
                                  
                                  return (
                                    <div
                                      key={collIndex}
                                      onClick={() => !isDisabled && handleCollectionSelection(database.name, collection.name)}
                                      className={`p-3 rounded-md transition-colors ${
                                        isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                      } ${
                                        isCollectionSelected
                                          ? 'bg-blue-100 border border-blue-300'
                                          : isDisabled
                                          ? 'bg-gray-100 border border-gray-200'
                                          : 'bg-white border border-gray-200 hover:bg-gray-50'
                                      }`}
                                    >
                                      <div className="flex items-center">
                                        <input
                                          type="checkbox"
                                          checked={isCollectionSelected}
                                          onChange={() => !isDisabled && handleCollectionSelection(database.name, collection.name)}
                                          disabled={isDisabled}
                                          className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-3 disabled:opacity-50"
                                        />
                                        <DocumentTextIcon className={`h-4 w-4 mr-2 ${
                                          isDisabled ? 'text-gray-400' : 'text-green-500'
                                        }`} />
                                        <span className={`text-sm font-medium ${
                                          isDisabled ? 'text-gray-500' : 'text-gray-900'
                                        }`}>
                                          {collection.name}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )
                          ) : (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              <RefreshIcon className="animate-spin h-4 w-4 mx-auto mb-2" />
                              Loading collections...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Backup Button */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={handleBackup}
          disabled={
            isBackingUp || 
            (activeView === 'database' && selectedDatabases.size === 0) ||
            (activeView === 'collections' && selectedCollections.size === 0)
          }
          className="flex items-center px-6 py-3 bg-orange-600 text-white font-medium rounded-lg shadow-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isBackingUp ? (
            <>
              <RefreshIcon className="animate-spin h-5 w-5 mr-2" />
              Creating Backup...
            </>
          ) : (
            <>
              <ArchiveIcon className="h-5 w-5 mr-2" />
              Create Backup ({activeView === 'database' ? selectedDatabases.size : selectedCollections.size})
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default BackUp;