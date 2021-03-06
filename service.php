<?

$action = $_GET['action'];

$host = 'localhost';
$user = 'root';
$password = '1';
$dbname = 'map';

$db = new PDO('mysql:host='.$host.';dbname='.$dbname, $user, $password);

switch($action) {
    case 'create':
        $payload = (array) json_decode(file_get_contents('php://input'));
        $query = 'INSERT INTO markers(id, lat, lng) VALUES(:id, :lat, :lng)';
        $cmd = $db->prepare($query);
        $cmd->bindParam(':id', $payload['id'], PDO::PARAM_STR);
        $cmd->bindParam(':lat', $payload['lat'], PDO::PARAM_STR);
        $cmd->bindParam(':lng', $payload['lng'], PDO::PARAM_STR);
        if($cmd->execute()) {
            echo json_encode(array(
               'status' => 'success',
            ));
        }
        else {
            echo json_encode(array(
                'status' => 'error',
            ));
        }
        break;
    case 'list':
        $query = 'SELECT * FROM markers';
        $cmd = $db->prepare($query);
        $cmd->execute();
        echo json_encode($cmd->fetchAll(PDO::FETCH_ASSOC));
        break;
    case 'delete':
        $id = $_GET['id'];
        $query = 'DELETE FROM markers WHERE id = :id';
        $cmd = $db->prepare($query);
        $cmd->bindParam(':id', $id, PDO::PARAM_STR);
        if($cmd->execute()) {
            echo json_encode(array(
                'status' => 'success',
            ));
        }
        else {
            echo json_encode(array(
                'status' => 'error',
            ));
        }
        break;
    case 'update':
        $payload = (array) json_decode(file_get_contents('php://input'));
        $query = 'UPDATE markers SET lat = :lat, lng = :lng WHERE id = :id';
        $cmd = $db->prepare($query);
        $cmd->bindParam(':id', $payload['id'], PDO::PARAM_STR);
        $cmd->bindParam(':lat', $payload['lat'], PDO::PARAM_STR);
        $cmd->bindParam(':lng', $payload['lng'], PDO::PARAM_STR);
        if($cmd->execute()) {
            echo json_encode(array(
                'status' => 'success',
            ));
        }
        else {
            echo json_encode(array(
                'status' => 'error',
            ));
        }
        break;
}
