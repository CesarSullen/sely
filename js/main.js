let db = {
	products: [
		/* { id, name, price, stock, category } */
	],
	sales: [
		/* { id, product_id, product_name, quantity, price_at_sale, total, date, type } */
	],

	categories: ["General"], // Default
	settings: {
		stockThreshold: 5,
	},
};

// Switch between tabs
function switchView(viewId, btnElement) {
	document
		.querySelectorAll(".view")
		.forEach((v) => v.classList.remove("active"));
	document
		.querySelectorAll(".nav-item")
		.forEach((b) => b.classList.remove("active"));

	document.getElementById(viewId).classList.add("active");

	if (btnElement) {
		btnElement.classList.add("active");
	}

	if (viewId === "view-home") renderDashboard();
	if (viewId === "view-inventory") renderInventory();
	if (viewId === "view-history") renderHistory();
}

function renderDashboard() {
	const data = calculateMetrics("today");

	document.getElementById("home-stat-income").textContent =
		`$${data.income.toFixed(2)}`;
	document.getElementById("home-stat-sales").textContent = data.salesCount;
}

function renderInventory(productsToDisplay = db.products) {
	const inventoryList = document.getElementById("inventory-list");
	inventoryList.innerHTML = "";

	if (productsToDisplay.length === 0) {
		inventoryList.innerHTML =
			'<p class="no-results">Sin productos que mostrar</p>';
		return;
	}

	renderCategoryFilters();

	const threshold = db.settings ? db.settings.stockThreshold : 5;

	productsToDisplay.forEach((product) => {
		const isOutOfStock = product.stock === 0;
		const isLowStock = product.stock <= threshold && !isOutOfStock;

		let badgeClass = "ok";
		let badgeText = "● Suficiente";

		if (isOutOfStock) {
			badgeClass = "out";
			badgeText = "● Sin stock";
		} else if (isLowStock) {
			badgeClass = "low";
			badgeText = "● Bajo stock";
		}

		const itemHtml = `
            <div class="inventory-item" onclick="openEditModal('${product.id}')">
                <div class="item-info">
                    <div class="item-icon-box">
                        <img src="./assets/icons/package.svg">
                    </div>
                    <div class="item-details">
                        <h4>${product.name}</h4>
						<small>${product.category || "Sin categoría"}</small>
                        <span class="stock-badge ${badgeClass}">
                            ${badgeText}
                        </span>
                    </div>
                </div>
                <div class="item-values">
				<div class="price">$${product.price.toFixed(2)}</div>
                    <div class="quantity">${product.stock} u</div>
                </div>
            </div>
        `;

		inventoryList.insertAdjacentHTML("beforeend", itemHtml);
	});
}

// Search Bar
function handleSearch(event) {
	const searchTerm = event.target.value.toLowerCase();

	let filtered = db.products;
	if (inventoryFilter === "low-stock") {
		filtered = db.products.filter(
			(p) => p.stock <= (db.settings.stockThreshold || 5),
		);
	} else if (inventoryFilter) {
		filtered = db.products.filter((p) => p.category === inventoryFilter);
	}

	const results = filtered.filter((p) =>
		p.name.toLowerCase().includes(searchTerm),
	);

	renderInventory(results);
}

let inventoryFilter = null;

function renderCategoryFilters() {
	const container = document.getElementById("category-filters");
	if (!container) return;
	container.innerHTML = "";

	const lowStockPill = document.createElement("div");
	lowStockPill.className = `category-pill low-stock-pill ${inventoryFilter === "low-stock" ? "active" : ""}`;
	lowStockPill.textContent = "● Bajo stock";
	lowStockPill.onclick = () => toggleInventoryFilter("low-stock");
	container.appendChild(lowStockPill);

	db.categories.forEach((cat) => {
		const pill = document.createElement("div");
		pill.className = `category-pill ${inventoryFilter === cat ? "active" : ""}`;
		pill.textContent = cat;
		pill.onclick = () => toggleInventoryFilter(cat);
		container.appendChild(pill);
	});
}

function toggleInventoryFilter(filter) {
	inventoryFilter = inventoryFilter === filter ? null : filter;

	let filtered = db.products;

	if (inventoryFilter === "low-stock") {
		const threshold = db.settings.stockThreshold || 5;
		filtered = db.products.filter((p) => p.stock <= threshold);
	} else if (inventoryFilter) {
		filtered = db.products.filter((p) => p.category === inventoryFilter);
	}

	renderCategoryFilters();
	renderInventory(filtered);
}

function openSupplyModal() {
	const dataList = document.getElementById("product-list");
	dataList.innerHTML = "";

	db.products.forEach((product) => {
		const option = document.createElement("option");
		option.value = product.name;
		dataList.appendChild(option);
	});

	document.getElementById("modal-supply").classList.add("active");
}

function handleSupplySubmit(event) {
	event.preventDefault();

	const name = document.getElementById("supply-product-input").value.trim();
	const quantity = parseInt(document.getElementById("supply-quantity").value);

	let product = db.products.find(
		(p) => p.name.toLowerCase() === name.toLowerCase(),
	);

	if (product) {
		product.stock += quantity;

		saveToStorage();
		renderDashboard();
		renderInventory();
		closeModal("modal-supply");
		alert(`Se han añadido ${quantity} unidades a ${product.name}.`);
	} else {
		alert(
			"Error: El producto no existe en la nomenclatura oficial. Pídale al Manager que se lo envíe.",
		);
	}
}

function openEditModal(productId) {
	const product = db.products.find((p) => p.id === productId);
	if (!product) return;

	document.getElementById("edit-product-id").value = product.id;
	document.getElementById("edit-product-name").value = product.name;
	document.getElementById("edit-product-price").value = product.price;
	document.getElementById("edit-product-stock").value = product.stock;

	document.getElementById("modal-edit").classList.add("active");
}

function handleEditSubmit(event) {
	event.preventDefault();

	const id = document.getElementById("edit-product-id").value;
	const product = db.products.find((p) => p.id === id);

	if (product) {
		product.price = parseFloat(
			document.getElementById("edit-product-price").value,
		);
		product.stock = parseInt(
			document.getElementById("edit-product-stock").value,
		);

		saveToStorage();
		renderInventory();
		closeModal("modal-edit");
	}
}

function renderHistory() {
	const timeline = document.getElementById("unified-timeline");
	timeline.innerHTML = "";

	const now = new Date();
	const startOfToday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
	).getTime();

	let allEvents = db.sales.filter((sale) => {
		const saleDate = new Date(sale.date).getTime();
		return saleDate >= startOfToday;
	});

	allEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

	if (allEvents.length === 0) {
		timeline.innerHTML =
			'<p class="no-results">No has realizado ventas hoy</p>';
		return;
	}

	allEvents.forEach((event) => {
		const date = new Date(event.date).toLocaleTimeString("es-ES", {
			hour: "2-digit",
			minute: "2-digit",
		});

		const html = `
            <div class="timeline-item">
                <div class="timeline-icon">
                    <img src="./assets/icons/arrow-circle-up.svg">
                </div>
                <div class="timeline-item-content">
                    <div class="timeline-main">
                        <strong>${event.product_name}</strong>
						<span>${event.quantity} u</span>
                    </div>
                    <div class="timeline-details">
                        <strong class="timeline-amount type-sale">
                            +$${event.total.toFixed(2)}
                        </strong>
                        <span class="timeline-date">${date}</span>
                    </div>
                </div>
            </div>
        `;
		timeline.insertAdjacentHTML("beforeend", html);
	});
}

// Calculate stats
function calculateMetrics(period) {
	const now = new Date();
	const startOfToday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
	);

	const filteredSales = db.sales.filter((s) => {
		if (period === "all") return true;
		return new Date(s.date) >= startOfToday;
	});

	return {
		income: filteredSales.reduce((sum, s) => sum + s.total, 0),
		salesCount: filteredSales.length,
	};
}

// Modals
function closeModal(modalId) {
	const modal = document.getElementById(modalId);
	if (modal) {
		modal.classList.remove("active");

		const form = modal.querySelector("form");
		if (form) {
			form.reset();
		}
	}
}

function openSaleModal() {
	const select = document.getElementById("sale-product-select");

	select.innerHTML =
		'<option value="" disabled selected>Selecciona un producto</option>';

	db.products.forEach((product) => {
		const option = document.createElement("option");
		option.value = product.id;
		option.textContent = `${product.name} ($${product.price})`;
		select.appendChild(option);
	});

	document.getElementById("modal-sale").classList.add("active");
}

function handleSaleSubmit(event) {
	event.preventDefault();

	const productId = document.getElementById("sale-product-select").value.trim();
	const quantityToSell = parseInt(
		document.getElementById("sale-quantity").value,
	);
	const priceAtSale = parseFloat(document.getElementById("sale-price").value);
	const product = db.products.find((p) => p.id === productId);

	if (product && product.stock >= quantityToSell) {
		product.stock -= quantityToSell;
		product.price = priceAtSale;

		db.sales.push({
			id: `sale-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
			product_id: product.id,
			product_name: product.name,
			quantity: quantityToSell,
			price_at_sale: priceAtSale,
			total: priceAtSale * quantityToSell,
			date: new Date().toISOString(),
			type: "sale",
		});

		saveToStorage();
		renderDashboard();
		closeModal("modal-sale");
		alert("Venta registrada con éxito.");
	} else {
		alert("Cantidad insuficiente en el inventario o producto no encontrado.");
	}
}

// Update sale price at selling
document
	.getElementById("sale-product-select")
	.addEventListener("change", (e) => {
		const productId = e.target.value;
		const product = db.products.find((p) => p.id === productId);

		if (product) {
			document.getElementById("sale-price").value = product.price;
		}
	});

// Importing data
function handleImport(file) {
	if (!file) return;

	const reader = new FileReader();
	reader.onload = (e) => {
		try {
			const imported = JSON.parse(e.target.result);

			if (imported.products && Array.isArray(imported.products)) {
				imported.products.forEach((newProd) => {
					const existingIndex = db.products.findIndex(
						(p) => p.id === newProd.id,
					);

					if (existingIndex !== -1) {
						db.products[existingIndex].name = newProd.name;
						db.products[existingIndex].category = newProd.category;
						db.products[existingIndex].price = newProd.price;
					} else {
						db.products.push(newProd);
					}
				});
			}

			if (imported.categories) {
				db.categories = [
					...new Set([...db.categories, ...imported.categories]),
				];
			}

			if (imported.settings && imported.settings.stockThreshold) {
				db.settings.stockThreshold = imported.settings.stockThreshold;
			}

			saveToStorage();
			alert(
				"Inventario sincronizado correctamente.\n\n⚠️ Por favor, revisa y ajusta las cantidades (stock) de los productos recibidos.",
			);
		} catch (err) {
			console.error("Error al parsear el JSON:", err);
			alert("Error: El archivo no es válido.");
		}
	};
	reader.readAsText(file);
}

// Exporting data
async function exportSalesToOwner() {
	const dateStr = new Date().toISOString().slice(0, 10);
	const fileName = `ventas_sely_${dateStr}.json`;

	const dataToExport = {
		sales: db.sales,
		products: db.products,
	};
	const blob = new Blob([JSON.stringify(dataToExport)], {
		type: "application/json",
	});
	const file = new File([blob], fileName, { type: "application/json" });

	if (navigator.canShare && navigator.canShare({ files: [file] })) {
		try {
			await navigator.share({
				files: [file],
				title: "Reporte de Ventas SELY",
				text: "Aquí tienes el reporte de ventas del día.",
			});
			return;
		} catch (err) {
			console.warn("Error al compartir, procediendo a descargar:", err);
		}
	}

	const url = URL.createObjectURL(blob);
	const downloadAnchorNode = document.createElement("a");
	downloadAnchorNode.setAttribute("href", url);
	downloadAnchorNode.setAttribute("download", fileName);
	document.body.appendChild(downloadAnchorNode);
	downloadAnchorNode.click();
	downloadAnchorNode.remove();
	URL.revokeObjectURL(url);
}

function clearDatabase() {
	const confirmed = confirm(
		"¿ESTÁS SEGURO?\nEsta acción borrará absolutamente todos tus datos, productos, ventas y categorías. No se puede deshacer.",
	);

	if (confirmed) {
		const reallyConfirmed = prompt(
			"Escribe 'BORRAR' en mayúsculas para confirmar la eliminación total:",
		);

		if (reallyConfirmed === "BORRAR") {
			db = {
				products: [],
				sales: [],
				categories: ["General"],
				settings: { stockThreshold: 5 },
			};

			localStorage.removeItem("sely_db");

			alert("Base de datos de SELY reseteada con éxito.");

			location.reload();
		} else {
			alert("Operación cancelada.");
		}
	}
}

function loadFromStorage() {
	const stored = localStorage.getItem("sely_db");
	if (stored) {
		db = JSON.parse(stored);
	}
	if (!checkPremiumStatus()) {
		document.getElementById("modal-premium").classList.add("active");
	}
}

function saveToStorage() {
	localStorage.setItem("sely_db", JSON.stringify(db));
}

loadFromStorage();
renderDashboard();

// Premium Locking
function checkPremiumStatus() {
	const premiumData = JSON.parse(localStorage.getItem("sely_premium"));
	if (!premiumData) return false;

	const today = new Date().getTime();
	if (today >= premiumData.expiryDate) {
		localStorage.removeItem("sely_premium");
		return false;
	}
	return true;
}

async function validatePremiumCode() {
	const inputCode = document.getElementById("premium-code").value.trim();
	if (!inputCode) return alert("Por favor, introduce un código.");

	try {
		const { data, error } = await _supabase
			.from("premium_codes")
			.select("id")
			.eq("code", inputCode)
			.eq("is_used", false)
			.single();

		if (error || !data) {
			throw new Error("Código no encontrado o ya ha sido utilizado.");
		}

		const { error: updateError } = await _supabase
			.from("premium_codes")
			.update({ is_used: true })
			.eq("id", data.id);

		if (updateError)
			throw new Error("Error al procesar el código. Inténtalo de nuevo.");

		activatePremium(30);

		closeModal("modal-premium");
		alert("¡Felicidades! Acceso Premium activado por 30 días.");
	} catch (err) {
		console.error("Error Premium:", err);
		alert(err.message || "Error al conectar con el servidor.");
	}
}

function activatePremium(days = 30) {
	const expiryDate = new Date().getTime() + days * 24 * 60 * 60 * 1000;
	const premiumData = { expiryDate: expiryDate };

	localStorage.setItem("sely_premium", JSON.stringify(premiumData));
}

if ("launchQueue" in window) {
	launchQueue.setConsumer(async (launchParams) => {
		if (!launchParams.files || launchParams.files.length === 0) return;

		for (const fileHandle of launchParams.files) {
			try {
				const file = await fileHandle.getFile();
				if (file.name.toLowerCase().endsWith(".json")) {
					handleImport(file);
				}
			} catch (err) {
				console.error("Error al acceder al archivo compartido:", err);
			}
		}
	});
}

async function trackProjectActivity(projectName) {
	try {
		const { error } = await _supabase.rpc("increment_visit", {
			name_param: projectName,
		});

		if (error) throw error;
	} catch (err) {
		console.warn("Offline mode");
	}
}

trackProjectActivity("SELY");

if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker
			.register("./sw.js")
			.then((registration) => {
				console.log("SW registrado con éxito:", registration.scope);
			})
			.catch((error) => {
				console.log("Fallo al registrar el SW:", error);
			});
	});
}
