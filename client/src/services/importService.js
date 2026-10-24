import api from './api';

export const importService = {
  getTemplateDownloadUrl: (datasetType) => {
    return `/api/import/templates/${datasetType}`;
  },

  downloadTemplate: async (datasetType) => {
    const response = await api.get(`/import/templates/${datasetType}`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `StockWise_Template_${datasetType.toUpperCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  previewAndValidateCsv: async (file, datasetType, userMapping = null) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('datasetType', datasetType);
    if (userMapping) {
      formData.append('userMapping', JSON.stringify(userMapping));
    }

    const response = await api.post('/import/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  confirmImport: async ({ datasetType, filename, rows, columnMapping }) => {
    const response = await api.post('/import/confirm', {
      datasetType,
      filename,
      rows,
      columnMapping,
    });
    return response.data;
  },

  getImportHistory: async () => {
    const response = await api.get('/import/history');
    return response.data;
  },

  getDataHealth: async () => {
    const response = await api.get('/import/data-health');
    return response.data;
  },
};
