export const getFiveElementEnergy = (response,element_type) => {
    if(!response) return 0
    const total = Object.values(response.element_energy).reduce((sum, val) => sum + val, 0)
    console.log(response.element_energy[element_type] / total)
    return response.element_energy[element_type] / total
}