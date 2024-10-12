export const getFiveElementEnergy = (response,element_type) => {
    if(!response) return 0
    const total = Object.values(response.element_energy.energy).reduce((sum, val) => sum + val, 0)
    return response.element_energy.energy[element_type] / total
}