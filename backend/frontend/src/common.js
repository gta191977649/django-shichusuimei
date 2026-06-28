export const getFiveElementEnergy = (response, element_type, elementEnergy = null) => {
    const energyPayload = elementEnergy || response?.element_energy
    if(!energyPayload?.energy) return 0

    const total = Object.values(energyPayload.energy).reduce((sum, val) => sum + val, 0)
    if(!total) return 0

    return energyPayload.energy[element_type] / total
}
