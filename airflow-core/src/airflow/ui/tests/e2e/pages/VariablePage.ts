/*!
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { expect, type Locator, type Page } from "@playwright/test";

import { BasePage } from "./BasePage";

export class VariablePage extends BasePage {
  public readonly addButton: Locator;
  public readonly importButton: Locator;
  public readonly paginationNextButton: Locator;
  public readonly paginationPrevButton: Locator;
  public readonly searchInput: Locator;
  public readonly selectAllCheckbox: Locator;
  public readonly table: Locator;
  public readonly tableRows: Locator;

  public constructor(page: Page) {
    super(page);

    this.searchInput = page.getByTestId("search-dags");
    this.addButton = page.getByRole("button", { name: /add/i });
    this.importButton = page.getByRole("button", { name: "Import Variables" });
    this.table = page.getByTestId("table-list");
    this.tableRows = this.table.locator("tbody tr");
    this.paginationNextButton = page.locator('[data-testid="next"]');
    this.paginationPrevButton = page.locator('[data-testid="prev"]');
    this.selectAllCheckbox = page.locator("thead input[type='checkbox']");
  }

  public async clickColumnToSort(columnName: string): Promise<void> {
    const columnHeader = this.table.locator(`th:has-text("${columnName}")`);
    const sortButton = columnHeader.locator('button[aria-label="sort"]');

    const sortStateBefore = (await columnHeader.getAttribute("aria-sort")) ?? "None";

    await sortButton.click();
    await expect(columnHeader).not.toHaveAttribute("aria-sort", sortStateBefore, { timeout: 30_000 });

    await this.waitForLoad();
  }

  public async clickNextPage(): Promise<void> {
    const initialKeys = await this.getVariableKeys();

    await this.paginationNextButton.click();

    await expect.poll(async () => this.getVariableKeys(), { timeout: 20_000 }).not.toEqual(initialKeys);

    await this.waitForLoad();
  }

  public async clickPrevPage(): Promise<void> {
    const initialKeys = await this.getVariableKeys();

    await this.paginationPrevButton.click();

    await expect.poll(async () => this.getVariableKeys(), { timeout: 20_000 }).not.toEqual(initialKeys);

    await this.waitForLoad();
  }

  public async getVariableKeys(): Promise<Array<string>> {
    await this.waitForLoad();
    const count = await this.tableRows.count();

    if (count === 0) {
      return [];
    }
    const keys = await this.tableRows.locator("td:nth-child(2)").allTextContents();

    return keys.map((key) => key.trim()).filter(Boolean);
  }

  public async navigate(): Promise<void> {
    await this.navigateTo("/variables");
  }

  public rowByKey(key: string): Locator {
    return this.page.locator(`tr:has-text("${key}")`);
  }

  public async search(key: string) {
    await this.searchInput.fill(key);
  }

  public async selectRow(key: string) {
    const row = this.rowByKey(key);
    const checkbox = row.locator('[id^="checkbox"][id$=":control"]');

    await checkbox.click();
  }

  public async sortByColumn(columnName: string) {
    const header = this.table.locator("thead th").filter({ hasText: new RegExp(columnName, "i") });

    await header.getByRole("button", { name: /sort/i }).click();
  }

  public async waitForLoad(): Promise<void> {
    await this.table.waitFor({ state: "visible", timeout: 15_000 });
    await this.waitForTableData();
  }

  private async waitForTableData(): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const table = document.querySelector('[data-testid="table-list"]');

        if (!table) return false;

        if (document.body.textContent.includes("No variables found")) {
          return true;
        }

        const rows = table.querySelectorAll("tbody tr");

        if (rows.length === 0) return false;

        const keyCells = table.querySelectorAll("tbody tr td:nth-child(2)");

        return [...keyCells].some((cell) => Boolean(cell.textContent.trim()));
      },
      undefined,
      { timeout: 60_000 },
    );
  }
}
