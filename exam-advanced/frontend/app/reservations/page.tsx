export default function ReservationListPage() {
  return (
    <div>
      <a href="/reservations/new" data-testid="nav-new">予約登録</a>
      <span> | </span>
      <a href="/reservations" data-testid="nav-list">予約一覧</a>
      <hr />

      <h1>予約一覧</h1>

      <p>
        リソース：
        <label>
          <input type="radio" name="resource_id" value="room-a" data-testid="filter-room-a" defaultChecked />
          会議室A
        </label>
        <label>
          <input type="radio" name="resource_id" value="room-b" data-testid="filter-room-b" />
          会議室B
        </label>
        <label>
          <input type="radio" name="resource_id" value="room-c" data-testid="filter-room-c" />
          会議室C
        </label>
        <span> </span>
        <button data-testid="filter-button">検索</button>
      </p>

      {/* TODO: APIから取得したデータを表示 */}
      <table data-testid="reservation-list">
        <thead>
          <tr>
            <th>イベント名</th>
            <th>開始</th>
            <th>終了</th>
          </tr>
        </thead>
        <tbody>
          <tr data-testid="reservation-item">
            <td>チームMTG</td>
            <td>2030/01/15 19:00</td>
            <td>2030/01/15 20:00</td>
          </tr>
          <tr data-testid="reservation-item">
            <td>1on1</td>
            <td>2030/01/15 22:00</td>
            <td>2030/01/15 23:00</td>
          </tr>
        </tbody>
      </table>

      <p>
        <button data-testid="prev-page" disabled>前へ</button>
        <span> 1 / 1 </span>
        <button data-testid="next-page" disabled>次へ</button>
      </p>
    </div>
  );
}
