import { api } from '../api.js';

export async function fetchClustersWithinLocation(){
  try{
    const res = await api.get('/api/clusters');
    return res;
  } catch(e){
    console.log(e);
  }
}

export async function fetchClusterReports(clusterId){
  try{
    const res = await api.get(`/api/clusters/${clusterId}/reports`);
    return res;
  } catch(e){
    console.log(e);
  }
}
