import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from scipy.interpolate import make_interp_spline
import matplotlib

matplotlib.rc('font', family='BIZ UDGothic')

# Define the data
TsukireiKeisuHeader = ["寅月", "卯月", "辰月", "巳月", "午月", "未月", "申月", "酉月", "戌月", "亥月", "子月", "丑月"]
TsukireiKeisuRowLabels = ["木", "火", "土", "金", "水"]
TsukireiKeisuMatrix = [
    [1.571, 2.000, 1.166, 0.862, 0.912, 0.924, 0.795, 0.500, 0.674, 1.590, 1.414, 0.898],
    [1.548, 1.414, 1.074, 1.571, 1.700, 1.341, 0.674, 0.707, 1.012, 0.774, 0.500, 0.821],
    [0.924, 0.500, 1.421, 1.548, 1.590, 1.674, 1.012, 1.000, 1.641, 0.645, 0.707, 1.512],
    [0.716, 0.707, 1.161, 0.924, 0.774, 1.069, 1.641, 2.000, 1.498, 0.912, 1.000, 1.348],
    [0.862, 1.000, 0.800, 0.716, 0.645, 0.612, 1.498, 1.414, 0.795, 1.700, 2.000, 1.041]
]

# Define colors for each element
element_colors = {
    "木": "green",
    "火": "red",
    "土": "brown",
    "金": "orange",
    "水": "blue"
}

# Create a figure with two subplots, adjusting the height of the bottom plot
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(9, 9), gridspec_kw={'height_ratios': [2, 1]})

# Heatmap
sns.heatmap(TsukireiKeisuMatrix, annot=True, fmt=".3f", ax=ax1,
            xticklabels=TsukireiKeisuHeader, yticklabels=TsukireiKeisuRowLabels,cbar=False)
ax1.set_title("月令係数表", fontsize=16)
ax1.set_xlabel("Month", fontsize=14)
ax1.set_ylabel("Element", fontsize=14)
ax1.set_xticklabels(ax1.get_xticklabels(), rotation=0, fontsize=12)
ax1.set_yticklabels(ax1.get_yticklabels(), fontsize=12)

# Smooth curves
x = np.arange(len(TsukireiKeisuHeader))
x_smooth = np.linspace(x.min(), x.max(), 300)

for i, element in enumerate(TsukireiKeisuRowLabels):
    y = TsukireiKeisuMatrix[i]
    spl = make_interp_spline(x, y, k=3)
    y_smooth = spl(x_smooth)
    ax2.plot(x_smooth, y_smooth, label=element, color=element_colors[element])

ax2.set_xticks(x)
ax2.set_xticklabels(TsukireiKeisuHeader, rotation=0, fontsize=12)
ax2.set_title("Element Energy Change", fontsize=16)
ax2.set_xlabel("Months", fontsize=14)
ax2.set_ylabel("Energy", fontsize=14)
ax2.legend(fontsize=12)
ax2.grid(True, linestyle='--', alpha=0.7)
ax2.tick_params(axis='both', which='major', labelsize=12)

# Set x and y limits for the curve plot
ax2.set_xlim(0, 11)

plt.tight_layout()
plt.show()