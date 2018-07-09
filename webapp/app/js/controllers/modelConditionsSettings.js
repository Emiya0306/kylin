/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Created by jiazhong on 2015/3/13.
 */

'use strict';

KylinApp.controller('ModelConditionsSettingsCtrl', function ($scope, $modal,MetaModel,modelsManager,VdmUtil) {
  $scope.modelsManager = modelsManager;
  $scope.availableFactTables = [];

  // partition date temporary object.
  // Because ng-chosen cannot watch string value, partition date should be object.
  $scope.partition_date = { type: '', format: '' };
  $scope.partition_time = { type: '', format: '' };
  
  $scope.initSetting = function (){
    $scope.selectedTables={fact:VdmUtil.getNameSpaceAliasName($scope.modelsManager.selectedModel.partition_desc.partition_date_column)}
    $scope.selectedTablesForPartitionTime={fact:VdmUtil.getNameSpaceAliasName($scope.modelsManager.selectedModel.partition_desc.partition_time_column)}
    $scope.availableFactTables.push(VdmUtil.removeNameSpace($scope.modelsManager.selectedModel.fact_table));
    var joinTable = $scope.modelsManager.selectedModel.lookups;
    for (var j = 0; j < joinTable.length; j++) {
      if(joinTable[j].kind=='FACT'){
        $scope.availableFactTables.push(joinTable[j].alias);
      }
    }

    $scope.initialPartitionSetting('Date');
    $scope.initialPartitionSetting('Time');
  }

  $scope.isFormatEdit = {editable:false};
  var judgeFormatEditable = function(dateColumn){
    if(dateColumn == null){
      $scope.isFormatEdit.editable = false;
      return;
    }
    var column = _.filter($scope.getColumnsByAlias(VdmUtil.getNameSpaceAliasName(dateColumn)),function(_column){
      var columnName=VdmUtil.getNameSpaceAliasName(dateColumn)+"."+_column.name;
      if(dateColumn == columnName){
        return _column;
      }
    });

    var data_type = column[0].datatype;
    if(data_type ==="bigint" ||data_type ==="int" ||data_type ==="integer"){
      $scope.isFormatEdit.editable = false;
      $scope.modelsManager.selectedModel.partition_desc.partition_date_format='yyyyMMdd';
      $scope.partitionColumn.hasSeparateTimeColumn=false;
      $scope.modelsManager.selectedModel.partition_desc.partition_time_column=null;
      $scope.modelsManager.selectedModel.partition_desc.partition_time_format=null;

      return;
    }

    $scope.isFormatEdit.editable = true;
    return;

  };

  $scope.getPartitonColumns = function(alias){
    var columns = _.filter($scope.getColumnsByAlias(alias),function(column){
      return column.datatype==="date"||column.datatype==="timestamp"||column.datatype==="string"||column.datatype.startsWith("varchar")||column.datatype==="bigint"||column.datatype==="int"||column.datatype==="integer";
    });
    return columns;
  };

  $scope.getPartitonTimeColumns = function(tableName,filterColumn){
    var columns = _.filter($scope.getColumnsByAlias(tableName),function(column){
      return (column.datatype==="time"||column.datatype==="timestamp"||column.datatype==="string"||column.datatype.startsWith("varchar"))&&(tableName+'.'+column.name!=filterColumn);
    });
    return columns;
  };

  $scope.partitionChange = function (dateColumn) {
    judgeFormatEditable(dateColumn);
  };

  $scope.tableChange = function (table) {
    if (table == null) {
      $scope.modelsManager.selectedModel.partition_desc.partition_date_column=null;
      $scope.isFormatEdit.editable = false;
      return;
    }
  };
  
  $scope.partitionColumn ={
      "hasSeparateTimeColumn" : false
  }

  /**
   * initial date or time partition select
   * 
   * @param {String: 'Date' | 'Time'} partitionFieldName 
   * @desc  cubeConfigName: 'partitionDateFormatOpt' or 'partitionTimeFormatOpt'
   *        modelFormatKey: 'partition_date_format' or 'partition_time_format'
   *        scopeName: 'partition_date' or 'partition_time'
   */
  $scope.initialPartitionSetting = function(partitionFieldName) {
    var cubeConfigName = 'partition' + partitionFieldName + 'FormatOpt';

    var lowerCaseName = partitionFieldName.toLowerCase(),
        modelFormatKey = 'partition_' + lowerCaseName + '_format',
        scopeName = 'partition_' + lowerCaseName,
        scopePartitionTypeWatchName = 'partition_' + lowerCaseName + '.type',
        scopePartitionFormatWatchName = 'partition_' + lowerCaseName + '.format';

    var partitionFormatOpt = $scope.cubeConfig[cubeConfigName];
    var partition_format = $scope.modelsManager.selectedModel.partition_desc[modelFormatKey];

    if(partitionFormatOpt.indexOf(partition_format) === -1) {
      $scope[scopeName].type = 'other';
      $scope[scopeName].format = partition_format;
    } else {
      $scope[scopeName].type = partition_format;
      $scope[scopeName].format = '';
    }

    // Add form change watcher. SetTimeout can escape the first render loop.
    setTimeout(function() {
      $scope.$watch(scopePartitionTypeWatchName, function (newValue, oldValue) {
        // Ng-chosen will change the value of all selects on DOM when you select each first.
        // So for fixing this bug, we should compare the newValue and oldValue.
        if(newValue !== oldValue) {
          if(newValue !== 'other') {
            $scope.modelsManager.selectedModel.partition_desc[modelFormatKey] = $scope[scopeName].format = newValue;
          } else {
            $scope[scopeName].format = '';
          }
        }
      });
    
      $scope.$watch(scopePartitionFormatWatchName, function (newValue, oldValue) {
        if(newValue !== oldValue) {
          $scope.modelsManager.selectedModel.partition_desc[modelFormatKey] = newValue;
        }
      });
    });
  };

  if ($scope.state.mode=='edit'){
    $scope.initSetting();
    judgeFormatEditable($scope.modelsManager.selectedModel.partition_desc.partition_date_column);
  }
  if($scope.modelsManager.selectedModel.partition_desc.partition_time_column){
    $scope.partitionColumn.hasSeparateTimeColumn = true;
  }
  $scope.toggleHasSeparateColumn = function(){
    if($scope.partitionColumn.hasSeparateTimeColumn == false){
      $scope.modelsManager.selectedModel.partition_desc.partition_time_column = null;
    }
  }
});
